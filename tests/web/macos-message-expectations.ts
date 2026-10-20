import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator, Page } from "playwright";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

// Written independently before the message renderer change. Numeric ranges are
// DESERT design acceptance bounds, not a claim of native Apple pixel parity.
export const messageBounds = Object.freeze({ width: [280, 380], inset: 12,
  title: [15, 19], body: [13, 16], face: [40, 64],
  faceTitleGap: [8, 24], titleBodyGap: [6, 14], bodyActionGap: [16, 28] });

export async function openMessage(page: Page, severity: "warning" | "error") {
  await (await navigationAction(page, "Component bank")).click();
  await page.getByRole("searchbox", { name: "Find component", exact: true }).fill("problem");
  const trigger = page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button");
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `Example ${severity}`, exact: true });
  await dialog.waitFor(); await settle(page);
  return { trigger, dialog };
}

export async function messageGeometry(dialog: Locator) {
  return dialog.evaluate(element => {
    const rect = (node: Element) => { const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
    const visible = (node: Element) => { const r = node.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const title = Array.from(element.querySelectorAll('h1,h2,h3,[data-slot="dialog-title"]')).find(visible)!;
    const body = Array.from(element.querySelectorAll('p,[data-slot="dialog-description"]')).find(node => visible(node) && node.textContent?.includes("isolated message"))!;
    const face = element.querySelector('[data-piece="face"]')!;
    const actions = Array.from(element.querySelectorAll("button")).filter(visible);
    const titleStyle = getComputedStyle(title), bodyStyle = getComputedStyle(body);
    const style = getComputedStyle(element);
    return { panel: rect(element), title: rect(title), body: rect(body), face: rect(face),
      titleSize: parseFloat(titleStyle.fontSize), bodySize: parseFloat(bodyStyle.fontSize),
      titleAlign: titleStyle.textAlign, bodyAlign: bodyStyle.textAlign,
      titleText: title.textContent, bodyText: body.textContent, background: style.backgroundColor,
      borderRadius: style.borderRadius, actions: actions.map(action => ({ ...rect(action), text: action.textContent?.trim(),
        name: action.getAttribute("aria-label"), disabled: (action as HTMLButtonElement).disabled })),
      viewport: { width: innerWidth, height: innerHeight }, overflow: element.scrollWidth > element.clientWidth + 1 };
  });
}

export function messageViolations(g: Awaited<ReturnType<typeof messageGeometry>>, scale = 1) {
  const failures: string[] = [], center = (r: {x: number; width: number}) => r.x + r.width / 2;
  const between = (value: number, bounds: readonly number[], label: string, scaled = true) => {
    const factor = scaled ? scale : 1;
    if (value < bounds[0]! * factor - 1 || value > bounds[1]! * factor + 1) failures.push(`${label}: ${value}`);
  };
  if (g.viewport.width >= 600 && scale === 1) between(g.panel.width, messageBounds.width, "compact panel width");
  if (g.panel.x < 11 || g.panel.right > g.viewport.width - 11 || g.panel.y < 11 || g.panel.bottom > g.viewport.height - 11) failures.push("viewport containment");
  if (g.overflow) failures.push("horizontal content overflow");
  if (g.actions.length !== 1) failures.push(`one real dismissal, observed ${g.actions.length}`);
  between(g.titleSize, messageBounds.title, "title size"); between(g.bodySize, messageBounds.body, "body size");
  between(g.face.width, messageBounds.face, "face size");
  for (const [label, item] of [["face", g.face], ["title", g.title], ["body", g.body]] as const) {
    if (Math.abs(center(item) - center(g.panel)) > 1) failures.push(`${label} not centered`);
  }
  if (g.titleAlign !== "center" || g.bodyAlign !== "center") failures.push("centered reading axis");
  between(g.title.y - g.face.bottom, messageBounds.faceTitleGap, "face/title gap");
  between(g.body.y - g.title.bottom, messageBounds.titleBodyGap, "title/body gap");
  if (g.actions.length === 1) {
    between(g.actions[0]!.y - g.body.bottom, messageBounds.bodyActionGap, "body/action gap");
    if (g.actions[0]!.height < 28 * scale - 1) failures.push("dismissal hit region too small");
  }
  return failures;
}

export async function saveMessageEvidence(page: Page, name: string, values: unknown) {
  const build = basename(process.env.DESERT_CATALOG_BUILD ?? "current");
  const directory = `artifacts/macos-messages/${build}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ build, values }, null, 2) + "\n");
  await page.screenshot({ path: `${directory}/${name}.png`, animations: "disabled" });
}
