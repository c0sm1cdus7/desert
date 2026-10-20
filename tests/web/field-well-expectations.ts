import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Locator, Page } from "playwright";
import { navigationAction, selectionTrigger, settle } from "./public-catalog-expectations.ts";

export async function selectionWell(page: Page, location: "bank" | "travel") {
  await (await navigationAction(page, location === "bank" ? "Component bank" : "Travel kit")).click();
  if (location === "bank") await page.getByRole("searchbox", { name: "Find component", exact: true }).fill("control.select");
  const trigger = selectionTrigger(page, location === "bank" ? "Single choice" : "Destination");
  const well = trigger.locator("xpath=ancestor-or-self::*[@data-floating-field][1]");
  await well.scrollIntoViewIfNeeded(); await settle(page);
  return { trigger, well };
}

export async function wellAppearance(well: Locator) {
  return well.evaluate(element => {
    const style = getComputedStyle(element), box = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), glyphs = [];
    let text: Node | null;
    while ((text = walker.nextNode())) if (text.textContent?.trim()) {
      const range = document.createRange(); range.selectNodeContents(text);
      const bounds = range.getBoundingClientRect();
      glyphs.push({ text: text.textContent.trim(), width: bounds.width, height: bounds.height });
    }
    return { box: box.toJSON(), background: style.backgroundColor, image: style.backgroundImage,
      transform: style.transform, outline: style.outlineStyle, outlineWidth: style.outlineWidth,
      glyphs,
      pressed: element.hasAttribute("data-pressed"), interactive: element.matches("button[aria-haspopup='listbox']"),
      innerPaint: Array.from(element.querySelectorAll("button, [data-button-content]")).map(child => ({
        tag: child.tagName, background: getComputedStyle(child).backgroundColor,
        image: getComputedStyle(child).backgroundImage, transform: getComputedStyle(child).transform,
      })) };
  });
}

export async function wellPoints(well: Locator) {
  const box = await well.boundingBox(); assert.ok(box);
  // These points represent the user's perceived rounded well, not its internal
  // input rectangle. Padding probes avoid the rounded silhouette's corners.
  return { "top padding": { x: box.x + box.width / 2, y: box.y + 3 },
    "bottom padding": { x: box.x + box.width / 2, y: box.y + box.height - 3 },
    "leading padding": { x: box.x + 3, y: box.y + box.height / 2 },
    "trailing padding": { x: box.x + box.width - 3, y: box.y + box.height / 2 },
    label: { x: box.x + 28, y: box.y + 14 },
    value: { x: box.x + box.width / 2, y: box.y + box.height * .72 },
    chevron: { x: box.x + box.width - 28, y: box.y + box.height * .72 } };
}

export async function saveWellEvidence(page: Page, name: string, values: unknown) {
  const build = basename(process.env.DESERT_CATALOG_BUILD ?? "current");
  const directory = `artifacts/field-well/${build}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ build, values }, null, 2) + "\n");
  await page.screenshot({ path: `${directory}/${name}.png`, animations: "disabled" });
}
