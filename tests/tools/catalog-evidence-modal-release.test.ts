// Under the release host's CSP (config.mjs: no inline style attribute applies unless the policy names its hash), a modal
// that closes must hand the page back: Bits locks the body through the CSSOM (overflow hidden, pointer-events none) and
// restores it by writing the body's original `style` attribute, which is empty. If the policy refuses that write, the lock
// stays and nothing on the page can be pressed. Found by the slice 3 package: at 390 px, choosing a destination in the
// navigation overlay left the whole Visual Catalog untappable.
// Run: node --test --test-timeout=900000 tests/tools/catalog-evidence-modal-release.test.ts   (not part of npm test: it builds and serves)
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { chromium, type Page } from "playwright";
import { readEvidencePieces } from "./catalog-evidence/pieces.ts";
import { serveEvidence } from "./catalog-evidence/serve.ts";

const root = resolve(import.meta.dirname, "../..");

const body = (page: Page) => page.evaluate(() => ({ pointerEvents: getComputedStyle(document.body).pointerEvents,
  overflow: getComputedStyle(document.body).overflow }));
const released = { pointerEvents: "auto", overflow: "visible" };
/** Bits restores the body after its cleanup delay (24 ms); a frame later the page must be free again. */
async function closed(page: Page) {
  await page.locator("[data-modal]").waitFor({ state: "detached" });
  await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== "none", undefined, { timeout: 2000 }).catch(() => undefined);
}

test("a closed modal releases the page under the release CSP: the navigation overlay at 390 px and a sheet at 1280 px",
  { timeout: 900_000 }, async () => {
    const { pieces } = await readEvidencePieces(root, ["attention-indicator"]);
    const server = await serveEvidence(pieces);
    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const refused: string[] = [];
        const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
        page.on("console", message => { if (message.type() === "error" && /Content Security Policy/.test(message.text())) refused.push(message.text()); });
        await page.goto(server.launchUrl);
        await page.getByRole("button", { name: "Create note", exact: true }).first().waitFor();
        await page.getByRole("button", { name: "Show navigation", exact: true }).click();
        await page.locator('[data-modal="navigation"]:not([data-closing])').waitFor();
        assert.equal((await body(page)).overflow, "hidden", "the open overlay locks the page");
        await page.getByRole("button", { name: "Visual catalog", exact: true }).click();
        await closed(page);
        assert.deepEqual(await body(page), released, "choosing a destination in the overlay releases the page");
        await page.locator('[data-view-item="public-catalog-bank"] [data-focus-key="action"]').click({ timeout: 3000 });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(server.origin);
        await page.getByRole("button", { name: "Create note", exact: true }).first().click();
        await page.locator("[data-modal]").first().waitFor();
        await page.keyboard.press("Escape");
        await closed(page);
        assert.deepEqual(await body(page), released, "a sheet closed with Escape releases the page");
        assert.deepEqual([...new Set(refused)], []);
      } finally { await browser.close(); }
    } finally { await server.close(); }
  });
