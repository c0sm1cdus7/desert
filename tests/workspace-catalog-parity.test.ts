import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { catalogWorkspaceSource } from "./fixtures/catalog-workspace.ts";

for (const width of [390, 1280]) test(`workspace adapter preserves the approved owner's page and search pixels at ${width}px`, async () => {
  const css = await rendererCss();
  const captures: Buffer[][] = [];
  for (const direct of [true, false]) {
    // Compare the finite current owner with its public adapter. The previous
    // frozen shell predates the approved indexed bank, trailing actions and
    // bottom navigation return, so its geometry is no longer the contract.
    const source = direct ? catalogWorkspaceSource.replace("views/Workspace.svelte", "pieces/ViewWorkspace.svelte") : catalogWorkspaceSource;
    const fixture = await svelteBrowser(source);
    try {
      const { page } = fixture;
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.addStyleTag({ content: css });
      await page.evaluate(() => { document.documentElement.dataset.rendererProfile = "apple-reference"; });
      const settled = () => page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      });
      await page.getByRole("heading", { name: "Visual catalog", exact: true }).first().waitFor();
      assert.equal(await page.locator('[data-catalog-index]:visible').count(),1);
      assert.equal(await page.locator('[data-catalog-entry]:visible').count(),0);
      assert.equal(await page.locator('[data-catalog-index] [data-destination="fact"]').count(),1);
      await settled();
      const pixels = [await page.screenshot()];
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.getByRole("searchbox", { name: "Search visual catalog", exact: true }).fill("availability");
      await settled();
      pixels.push(await page.screenshot());
      captures.push(pixels);
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.close(); }
  }
  for (let state = 0; state < 2; state++) {
    assert.ok(captures[1]![state]!.equals(captures[0]![state]!), state ? "search pixel parity" : "page pixel parity");
  }
});
