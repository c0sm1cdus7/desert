import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { identityGeometry, assertIdentityGeometry } from "../fixtures/toolbar-identity-expectations.ts";

async function catalog() {
  if (process.env.DESERT_VISUAL_URL) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(process.env.DESERT_VISUAL_URL);
    return { page, close: () => browser.close() };
  }
  const fixture = await browserFixture();
  try {
  assert.equal(await fixture.page.locator('[data-catalog-toolbar][data-piece="toolbar"] > .toolbar-row').count(), 1,
    "the normal product shell also uses the shared toolbar owner");
  await openCatalog(fixture.page);
  assert.equal(await fixture.page.locator('[data-catalog-toolbar][data-piece="toolbar"] > .toolbar-row').count(), 1,
    "the product catalog shell cannot recreate its own toolbar anatomy");
  return fixture;
  } catch (error) { await fixture.close(); throw error; }
}

test("message identity belongs to the header, with readable body and shared dismissal", { timeout: 30000 }, async () => {
  const f = await catalog();
  try {
    for (const theme of ["dark", "light"] as const) {
      await f.page.emulateMedia({ colorScheme: theme });
      for (const width of [1280, 390, 320]) {
        await f.page.setViewportSize({ width, height: 844 });
        for (const severity of ["warning", "error"]) {
          await f.page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button").click();
          const dialog = f.page.getByRole("dialog");
          await settleMotion(f.page);
          const header = dialog.locator('[data-surface-slot="top"]');
          const body = dialog.locator('[data-surface-slot="content"]');
          assert.equal(await header.locator('[data-piece="face"]').count(), 1,
            "message face must be part of its header, not a decoration in the body");
          assert.equal(await body.locator("svg").count(), 0);
          assert.equal(await header.locator('[data-piece="face"]').getAttribute("data-tone"), severity);
          const geometry = await identityGeometry(header);
          assertIdentityGeometry(geometry);
          const titleFits = await header.getByRole("heading").evaluate(node => {
            const range = document.createRange(); range.selectNodeContents(node);
            const text = range.getBoundingClientRect(), box = node.getBoundingClientRect();
            return text.bottom <= box.bottom + 1 && text.right <= box.right + 1;
          });
          assert.equal(titleFits, true, "the cause of a message remains readable, not visually clipped");
          const text = await body.locator('[data-slot="dialog-description"]').evaluate(node => ({ size: parseFloat(getComputedStyle(node).fontSize),
            line: parseFloat(getComputedStyle(node).lineHeight), textAlign: getComputedStyle(node).textAlign }));
          assert.ok(geometry.titleSize > text.size && text.line >= text.size * 1.4);
          assert.equal(text.textAlign, "center", "compact message copy shares the face and title's reading axis");
          const close = dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
          assert.equal(await header.getByRole("button").count(), 0, "an alert has no competing navigation action");
          assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
          assert.equal(await close.isEnabled(), true);
          const directory = `artifacts/composition-repair/${process.env.DESERT_VISUAL_PHASE ?? "current"}`;
          await mkdir(directory, { recursive: true });
          await dialog.screenshot({ path: `${directory}/message-${severity}-${theme}-${width}.png` });
          await close.click(); await dialog.waitFor({ state: "hidden" });
        }
      }
    }
  } finally { await f.close(); }
});
