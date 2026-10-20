import test from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { identityEvidence, identityGeometry, assertIdentityGeometry, assertVisibleChrome } from "../fixtures/toolbar-identity-expectations.ts";

// The v11 run is a deliberately failing, separately hosted frozen baseline.
// Run again with DESERT_CATALOG_BUILD set to the candidate; no build is overwritten.
test("built shared bank separates centered dialog identity from navigation in both themes and layout scales", { timeout: 60000 }, async t => {
  const f = await publicCatalogFixture();
  const evidence = await identityEvidence(basename(process.env.DESERT_CATALOG_BUILD ?? "built"));
  t.diagnostic(`Evidence: ${evidence.directory}`);
  const failures: string[] = [];
  const titleSizes = new Map<string, number>();
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await (await navigationAction(f.page, "Component bank")).click();
    await f.page.getByRole("heading", { name: "Component bank", exact: true }).waitFor();
    assert.equal(await f.page.locator('[data-catalog-toolbar] [data-piece="face"]').count(), 0,
      "normal catalog chrome does not use the optional face");
    for (const theme of ["light", "dark"] as const) for (const width of [1280, 390, 320]) for (const scale of [1, 2]) {
      await f.page.emulateMedia({ colorScheme: theme });
      await f.page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      const opener = f.page.locator('[data-specimen="problem:error"]').getByRole("button");
      await opener.click();
      const dialog = f.page.getByRole("dialog", { name: "Example error", exact: true });
      await dialog.waitFor(); await settle(f.page);
      const geometry = await identityGeometry(dialog.locator('[data-surface-slot="top"]'));
      await evidence.save(`${theme}-${width}-scale-${scale}`, geometry, dialog);
      if (scale === 1) titleSizes.set(`${theme}-${width}`, geometry.titleSize);
      else if (geometry.titleSize < titleSizes.get(`${theme}-${width}`)! * 2 - .1) {
        failures.push(`${theme}/${width}/${scale}: title did not actually enlarge to 200%`);
      }
      try {
        assertIdentityGeometry(geometry); await assertVisibleChrome(dialog);
        assert.ok(geometry.titleText.top >= geometry.header.top && geometry.titleText.bottom <= geometry.header.bottom,
          "the short complete message title is visible initially; its cause must not require discovering a nested scroll region");
      }
      catch (error) { failures.push(`${theme}/${width}/${scale}: ${String(error)}`); }
      assert.equal(await dialog.locator('[data-surface-slot="top"]').getByRole("button").count(), 0,
        "compact messages do not duplicate their single dismissal in the identity header");
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
      await dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      if (!await opener.evaluate(node => node === document.activeElement)) failures.push(`${theme}/${width}/${scale}: Close lost opener focus`);
    }
    const opener = f.page.locator('[data-specimen="problem:warning"]').getByRole("button");
    await opener.click(); const dialog = f.page.getByRole("dialog", { name: "Example warning", exact: true });
    await dialog.waitFor(); await f.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    if (!await opener.evaluate(node => node === document.activeElement)) failures.push("Escape lost opener focus");
    await evidence.save("result", { build: process.env.DESERT_CATALOG_BUILD, failures });
    assert.deepEqual(failures, [], "independent built-surface expectations");
  } finally { await f.close(); }
});
