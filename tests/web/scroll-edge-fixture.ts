import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator, Page } from "playwright";

export async function paint(page: Page) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}

export async function scrollTo(content: Locator, position: "start" | "middle" | "end") {
  await content.evaluate((node, position) => {
    const max = node.scrollHeight - node.clientHeight;
    node.scrollTop = position === "start" ? 0 : position === "end" ? max : max / 2;
  }, position);
  await paint(content.page());
}

export async function edgeState(scope: Locator) {
  return scope.evaluate(root => [...root.querySelectorAll("[data-scroll-edge]")]
    .filter(node => node.closest("[data-surface-frame]") === (root.matches("[data-surface-frame]") ? root : null)).map(node => {
    const css = getComputedStyle(node), box = node.getBoundingClientRect();
    const layers = [node, ...node.querySelectorAll("*")].flatMap(layer => [null, "::before", "::after"].map(pseudo => {
      const style = getComputedStyle(layer, pseudo);
      return { backdrop: style.backdropFilter, filter: style.filter, mask: style.maskImage, background: style.backgroundImage,
        fill: style.backgroundColor, display: style.display, opacity: Number(style.opacity) };
    }));
    return { edge: node.getAttribute("data-scroll-edge"), active: node.getAttribute("data-active"),
      hidden: node.getAttribute("aria-hidden"), pointer: css.pointerEvents, opacity: Number(css.opacity),
      display: css.display, visibility: css.visibility, box: box.toJSON(), layers,
      focusable: node.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])').length };
  }));
}

export async function assertEdge(scope: Locator, edge: "top" | "bottom", active: boolean, reduced = false) {
  const states = await edgeState(scope), state = states.find(value => value.edge === edge);
  assert.ok(state, `Expected shared ${edge} scroll edge; observed ${JSON.stringify(states)}`);
  assert.equal(state.active, String(active), `${edge} edge follows its own scroll position`);
  assert.equal(state.hidden, "true", "purely visual edge stays out of the accessibility tree");
  assert.equal(state.pointer, "none", "edge never intercepts pointer input");
  assert.equal(state.focusable, 0, "edge introduces no tab stops");
  if (!active) assert.ok(state.visibility === "hidden" || state.display === "none" || state.opacity === 0,
    "inactive boundary does not paint a decorative band");
  if (active) {
    assert.ok(state.box.width > 0 && state.box.height > 0 && state.opacity > 0 && state.display !== "none");
    if (reduced) {
      assert.ok(state.layers.every(layer => layer.backdrop === "none"), "reduced transparency removes all edge blur");
      assert.ok(state.layers.some(layer => layer.background !== "none" || !["transparent", "rgba(0, 0, 0, 0)"].includes(layer.fill)),
        "reduced transparency retains a visible non-blur separator");
    }
    else {
      assert.ok(state.layers.every(layer => layer.filter === "none"), "reading content itself is never filtered");
      assert.ok(state.layers.every(layer => layer.backdrop === 'none'),
        'both page edges cast the same progressive shadow; neither edge is glass or blur');
      assert.ok(state.layers.some(layer => /linear-gradient/.test(layer.background)),
        "edge shading changes progressively rather than ending abruptly");
    }
  }
  return state;
}

export async function usableControl(control: Locator, keyboard = false) {
  // Set keyboard modality without navigating through an unrelated content
  // control, whose native focus behavior can legitimately change scroll position.
  if (keyboard) { await control.page().keyboard.press("Shift"); await control.focus(); }
  const state = await control.evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node);
    const focusCss = getComputedStyle(node.closest('[data-slot="input-group"]') ?? node);
    // Existing circular/capsule faces exclude rectangle corners (confirmed in
    // frozen v19). Probe both full diameters, not points outside the visible face.
    const midX = box.x + box.width / 2, midY = box.y + box.height / 2;
    const points = [[box.x + 3, midY], [box.right - 3, midY],
      [midX, box.y + 3], [midX, box.bottom - 3], [midX, midY]];
    return { width: box.width, height: box.height, focused: node === document.activeElement,
      visibleFocus: node.matches(":focus-visible"), outline: focusCss.outlineStyle, outlineWidth: parseFloat(focusCss.outlineWidth),
      shadow: focusCss.boxShadow, filter: css.filter, hits: points.map(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!); return hit === node || !!hit && node.contains(hit);
      }) };
  });
  assert.ok(state.width >= 28 && state.height >= 28, "edge leaves existing comfortable targets intact");
  assert.ok(state.hits.every(Boolean), `control's visible target remains exposed: ${JSON.stringify(state)}`);
  assert.equal(state.filter, "none", "toolbar labels are not blurred with scrolling content");
  if (keyboard) {
    assert.ok(state.focused && state.visibleFocus, "keyboard focus stays visible");
    assert.ok(state.outline !== "none" && state.outlineWidth > 0 || state.shadow !== "none", "focus retains a visible indicator");
  }
  return state;
}

export async function saveEdgeEvidence(page: Page, name: string, scope: Locator, extra: unknown = {}) {
  const build = basename(process.env.DESERT_CATALOG_BUILD ?? "catalog") + "--" + basename(process.env.DESERT_WEB_BUILD ?? "notebook");
  const directory = `artifacts/scroll-edge/${build}`;
  await mkdir(directory, { recursive: true });
  const media = await page.evaluate(() => ({ reducedTransparency: matchMedia("(prefers-reduced-transparency:reduce)").matches,
    increasedContrast: matchMedia("(prefers-contrast:more)").matches, dark: matchMedia("(prefers-color-scheme:dark)").matches }));
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ edges: await edgeState(scope), media, extra }, null, 2) + "\n");
  await page.screenshot({ path: `${directory}/${name}.png`, animations: "disabled" });
  return directory;
}
