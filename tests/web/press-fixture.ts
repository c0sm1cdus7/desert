import { mkdir, writeFile } from "node:fs/promises";
import { type Locator, type Page } from "playwright";
import { activePanel, panelToolbar, settleMotion, waitForEnabled } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

export async function catalog() {
  const f = await browserFixture();
  try {
    for (const title of ["First press witness", "Middle press witness", "Third press witness"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: "Published reading content." });
      await f.session.accept(prepared.id, prepared.confirmationDigest);
    }
    await f.page.reload();
    await f.page.locator('[data-composition="collection"]:visible button').nth(2).waitFor();
    await openCatalog(f.page);
    return f;
  }
  catch (error) { await f.close(); throw error; }
}
export const cases = ["neutral", "primary", "first-row", "middle-row", "last-row"] as const;
export type Case = typeof cases[number];
export async function finishTarget(page: Page) {
  if (await activePanel(page).isVisible()) {
    await panelToolbar(page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await activePanel(page).waitFor({ state: "hidden" });
  }
}
export async function openNotes(page: Page) {
  await finishTarget(page);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.locator('[data-composition="collection"]:visible button').nth(2).waitFor();
  await settleMotion(page);
}
export async function target(page: Page, name: Case) {
  await openNotes(page);
  let button: Locator;
  if (name === "neutral" || name === "primary") {
    await page.getByRole("button", { name: "Create note", exact: true }).click();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Press feedback only");
    await page.getByRole("textbox", { name: "Content", exact: true }).fill("A valid published draft.");
    button = panelToolbar(page, "bottom").locator(`[data-emphasis="${name === "primary" ? "primary" : "secondary"}"]`);
    await waitForEnabled(button);
  } else button = page.locator('[data-composition="collection"]:visible button').nth(name === "first-row" ? 0 : name === "middle-row" ? 1 : 2);
  // These tests isolate native held/cancelled paint on real product controls.
  // Execution and navigation are covered separately; prevent only activation.
  await button.evaluate(node => node.addEventListener("click", event => {
    event.preventDefault(); event.stopPropagation();
  }));
  await settleMotion(page);
  return button;
}
export async function appearance(node: Locator) {
  return node.evaluate(element => {
    const style = getComputedStyle(element), content = element.querySelector("[data-button-content]");
    const contentStyle = content && getComputedStyle(content);
    return { box: element.getBoundingClientRect().toJSON(), transform: style.transform,
      contentScale: contentStyle ? new DOMMatrix(contentStyle.transform).m11 : null,
      background: style.backgroundColor, overlay: style.boxShadow, color: style.color,
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
