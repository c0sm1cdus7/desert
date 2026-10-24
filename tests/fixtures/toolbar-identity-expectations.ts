import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Locator } from "playwright";

export async function identityEvidence(label: string) {
  const root = resolve("artifacts/toolbar-identity-independent");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(`${root}/${label}-`);
  return { directory, async save(name: string, value: unknown, target?: Locator) {
    await writeFile(`${directory}/${name}.json`, JSON.stringify(value, null, 2) + "\n");
    if (target) await target.page().screenshot({ path: `${directory}/${name}.png` });
  } };
}

/** Owner-request expectations, written independently of the layout/CSS implementation.
 * A supplied identity is centered across the whole toolbar above its title/actions.
 * Close is a separate action, never the face's neighboring icon in one heading.
 */
export async function identityGeometry(header: Locator) {
  return header.evaluate(node => {
    const rect = (element: Element) => element.getBoundingClientRect().toJSON();
    const face = node.querySelector('[data-piece="face"]')!;
    const title = node.querySelector('h2, [role="heading"]')!;
    const titleRange = document.createRange(); titleRange.selectNodeContents(title);
    return { header: rect(node), face: rect(face), title: rect(title), titleText: titleRange.getBoundingClientRect().toJSON(),
      scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      titleTextContent: title.textContent,
      faceHidden: face.getAttribute("aria-hidden"),
      themeRadius: (() => { const probe = document.createElement("i"); probe.style.borderRadius = "var(--radius)"; node.append(probe);
        const value = parseFloat(getComputedStyle(probe).borderTopLeftRadius); probe.remove(); return value; })(),
      buttons: [...node.querySelectorAll("button")].map(button => ({ ...rect(button),
        label: button.getAttribute("aria-label") ?? button.textContent, disabled: button.disabled,
        icon: button.querySelector("svg") ? rect(button.querySelector("svg")!) : null,
        radius: parseFloat(getComputedStyle(button).borderRadius) })) };
  });
}

export function assertIdentityGeometry(geometry: Awaited<ReturnType<typeof identityGeometry>>) {
  const { header, face, title, buttons } = geometry;
  assert.ok(Math.abs(face.x + face.width / 2 - header.x - header.width / 2) <= 1,
    `face center ${face.x + face.width / 2} must equal whole toolbar center ${header.x + header.width / 2} ±1px`);
  assert.ok(face.top >= header.top && face.bottom <= header.bottom, "supplied face is initially visible inside the toolbar viewport");
  assert.ok(face.bottom + 4 <= title.top, "face is in a separate row above the title with at least 4px separation");
  assert.ok(buttons.every(button => face.bottom + 4 <= button.top), "face is above and separate from Close and all other actions");
  assert.equal(geometry.faceHidden, "true", "the decorative face does not duplicate the accessible title");
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, "toolbar does not overflow horizontally");
  assert.ok(buttons.every(button => button.left >= header.left - 1 && button.right <= header.right + 1),
    "visible toolbar actions stay inside the toolbar");
  assert.ok(buttons.every(button => button.width >= 44 && button.height >= 44), "task actions keep 44px hit targets");
  assert.ok(buttons.every(button => Math.abs(button.width - button.height) <= 1 && button.radius === geometry.themeRadius),
    "width-constrained toolbar actions keep the shared square target and the one radius (DESIGN §7.1), not an ellipse");
  assert.ok(buttons.every(button => !button.icon || button.icon.left >= button.left && button.icon.right <= button.right &&
    button.icon.top >= button.top && button.icon.bottom <= button.bottom), "scaled action glyphs fit inside their target");
  assert.ok(buttons.every(button => button.right <= title.left + 1 || button.left >= title.right - 1 ||
    button.bottom <= title.top + 1 || button.top >= title.bottom - 1), "title and actions do not overlap");
}

export async function assertVisibleChrome(dialog: Locator) {
  const bounds = await dialog.evaluate(node => {
    const rect = (selector: string) => node.querySelector(selector)!.getBoundingClientRect().toJSON();
    const content = node.querySelector<HTMLElement>('[data-surface-slot="content"]')!;
    const style = getComputedStyle(content);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    return { dialog: node.getBoundingClientRect().toJSON(), header: rect('[data-surface-slot="top"]'),
      footer: rect('[data-surface-slot="bottom"]'), content: rect('[data-surface-slot="content"]'),
      usefulContent: content.clientHeight - padding, requestedContent: content.scrollHeight - padding,
      lineHeight: parseFloat(style.lineHeight) };
  });
  assert.ok(bounds.header.top >= bounds.dialog.top - 1 && bounds.footer.bottom <= bounds.dialog.bottom + 1,
    `header and dismissal remain within the visible surface: ${JSON.stringify(bounds)}`);
  assert.ok(bounds.content.bottom <= bounds.footer.top + 1, "body never overlays dismissal");
  assert.ok(bounds.usefulContent >= Math.min(bounds.requestedContent, bounds.lineHeight * 2),
    `at least two enlarged lines of usable body remain: ${JSON.stringify(bounds)}`);
  return bounds;
}

export async function assertTextReachable(text: Locator, last: boolean) {
  const visible = await text.evaluate((node, last) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) if (walker.currentNode.textContent?.trim()) nodes.push(walker.currentNode as Text);
    const target = last ? nodes.at(-1)! : nodes[0]!;
    const offset = last ? target.length - 1 : 0;
    const range = document.createRange(); range.setStart(target, offset); range.setEnd(target, offset + 1);
    const ancestors: HTMLElement[] = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) ancestors.push(parent);
    for (const parent of ancestors) {
      if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
        const parentBox = parent.getBoundingClientRect(), glyph = range.getBoundingClientRect();
        parent.scrollTop += last ? glyph.bottom - parentBox.bottom + 4 : glyph.top - parentBox.top - 4;
      }
    }
    const glyph = range.getBoundingClientRect();
    let top = 0, bottom = innerHeight, left = 0, right = innerWidth;
    for (const parent of [node, ...ancestors]) {
      const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
      if (style.overflowY !== "visible") { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      if (style.overflowX !== "visible") { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    }
    const hit = document.elementFromPoint(glyph.x + glyph.width / 2, glyph.y + glyph.height / 2);
    return { glyph: glyph.toJSON(), top, bottom, left, right, hit: hit === node || node.contains(hit) };
  }, last);
  assert.ok(visible.glyph.top >= visible.top - 1 && visible.glyph.bottom <= visible.bottom + 1 &&
    visible.glyph.left >= visible.left - 1 && visible.glyph.right <= visible.right + 1 && visible.hit,
    `${last ? "Last" : "First"} text glyph can be read through actual scrollable regions: ${JSON.stringify(visible)}`);
}
