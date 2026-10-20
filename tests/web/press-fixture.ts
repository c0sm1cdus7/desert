import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Locator, type Page } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

export async function catalog() {
  if (process.env.DESERT_VISUAL_URL) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
    await page.goto(process.env.DESERT_VISUAL_URL);
    await page.locator('[data-specimen="context:available"]').waitFor();
    return { page, close: () => browser.close() };
  }
  const f = await browserFixture();
  try { await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click(); return f; }
  catch (error) { await f.close(); throw error; }
}
export const cases = ["neutral", "primary", "first-row", "middle-row", "last-row"] as const;
export type Case = typeof cases[number];
export async function target(page: Page, name: Case) {
  if (name === "neutral" || name === "primary") return page.locator('[data-specimen="review:uncertain"]')
    .locator(`[data-emphasis="${name === "primary" ? "primary" : "secondary"}"]`);
  await page.locator('[data-specimen="context:available"]').getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: "Context specimen", exact: true });
  await settleMotion(page);
  return dialog.locator('[data-piece="destination-row"]').nth(name === "first-row" ? 0 : name === "middle-row" ? 1 : 2);
}
export async function appearance(node: Locator) {
  return node.evaluate(element => {
    const style = getComputedStyle(element), content = element.querySelector("[data-button-content]");
    const contentStyle = content && getComputedStyle(content);
    return { box: element.getBoundingClientRect().toJSON(), transform: style.transform,
      contentScale: contentStyle ? new DOMMatrix(contentStyle.transform).m11 : null,
      background: style.backgroundColor, overlay: style.backgroundImage, color: style.color,
      topBorder: style.borderTopWidth, bottomBorder: style.borderBottomWidth,
      focus: element.matches(":focus-visible") };
  });
}
export async function evidence(page: Page, name: string, values: unknown) {
  const directory = `artifacts/visual-scale/${process.env.DESERT_VISUAL_PHASE ?? "current"}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${name}.json`, JSON.stringify({ route: page.url(), values }, null, 2));
  await page.screenshot({ path: `${directory}/${name}.png` });
}
