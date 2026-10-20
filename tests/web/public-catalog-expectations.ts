import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Locator, Page } from "playwright";

// Expectations were transcribed from Apple's unmodified sample/capture, not CSS.
// Font rasterization and visual acceptance are deliberately not asserted here.
export const nativeHome = Object.freeze({
  viewport: { width: 900, height: 450 }, deviceScaleFactor: 2,
  card: { width: 196, height: 140, gap: 14, radius: 15 },
  heroTitle: { size: 26, line: 32, weight: 700 },
  sectionTitle: { size: 17, line: 22, weight: 700 },
  cardTitle: { size: 15, line: 20, weight: 600 },
});

export const action = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
// The installed Select primitive uses a native button + listbox pattern, not
// an editable combobox. Constrain haspopup so v4's dialog opener cannot match.
export const selectionTrigger = (page: Page, name: string) => {
  // A full well announces both its field label and its current visible value.
  // Compact currency triggers already include both in their supplied name.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page.getByRole("button", { name: new RegExp(`^${escaped}(?: · .+)?$`) })
    .and(page.locator('[aria-haspopup="listbox"]'));
};
export const card = (page: Page, name: string) => action(page, name);

export async function navigationAction(page: Page, name: string, keyboard = false) {
  const destination = action(page, name);
  const trigger = page.getByRole("button", { name: "Show navigation", exact: true, includeHidden: true });
  await destination.or(trigger).first().waitFor({ state: "visible" });
  const closed = await trigger.count() > 0 && await trigger.getAttribute("aria-expanded") === "false";
  if (closed || !await destination.isVisible()) {
    // A destination from the departing Sheet can still be visible during its exit.
    await page.locator('[data-slot="sidebar"][data-presentation="overlay"]').waitFor({ state: "hidden" });
    if (keyboard) { await trigger.focus(); await page.keyboard.press("Enter"); }
    else await trigger.click();
  }
  await destination.waitFor({ state: "visible" });
  return destination;
}

export async function search(page: Page) {
  const input = page.getByRole("searchbox", { name: "Search landmarks", exact: true });
  // Activate the magnifier when collapsed, then fill the real scoped input.
  // The visible-input path remains useful for already-active search/back returns.
  await input.or(action(page, "Search")).first().waitFor({ state: "visible" });
  if (!await input.isVisible()) await action(page, "Search").click();
  await input.waitFor({ state: "visible" });
  return input;
}

export async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // ResizeObserver/scroll geometry commits after layout, before motion can be
    // enumerated. Waiting only existing animations can inspect the old frame.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => {
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === "number" && Number.isFinite(end);
    }).map(animation => animation.finished.catch(() => {})));
  });
}

export function readOnlyRequests(page: Page) {
  const forbidden: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) forbidden.push(`${request.method()} ${request.url()}`);
  });
  return () => assert.deepEqual(forbidden, [], "The public catalog must not invoke product mutation/acceptance endpoints");
}

export async function box(locator: Locator) {
  const result = await locator.boundingBox();
  assert.ok(result, "Expected visible geometry");
  return result;
}

export function near(actual: number, expected: number, label: string, tolerance = 1) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}±${tolerance}, observed ${actual}`);
}

export async function textStyle(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    const range = document.createRange();
    range.selectNodeContents(element);
    const glyphs = range.getBoundingClientRect();
    return { family: style.fontFamily, size: parseFloat(style.fontSize), line: parseFloat(style.lineHeight),
      weight: Number(style.fontWeight), tracking: style.letterSpacing, color: style.color,
      textBounds: { x: glyphs.x, y: glyphs.y, width: glyphs.width, height: glyphs.height } };
  });
}

// Chromium's resolved font evidence complements CSS families; it is not a
// portable product contract, a font-license assertion, or a visual match score.
export async function resolvedFonts(page: Page) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: "h1" });
    return nodeId ? (await session.send("CSS.getPlatformFontsForNode", { nodeId })).fonts : [];
  } finally { await session.detach(); }
}

export async function evidence(page: Page, name: string, values: unknown) {
  const directory = new URL("../../artifacts/public-catalog-benchmark/", import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(`${name}.json`, directory), JSON.stringify(values, null, 2) + "\n");
  await page.screenshot({ path: new URL(`${name}.png`, directory).pathname, animations: "disabled" });
}
