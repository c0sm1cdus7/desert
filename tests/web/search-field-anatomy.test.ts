import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

// Search always expands from the shared toolbar, never from surface content.
// Clearing the query and closing the overlay remain distinct operations.
test("toolbar search keeps its anatomy while catalog and collection content have no inline search", async () => {
  const f = await publicCatalogFixture();
  const evidence = "artifacts/search-field-anatomy";
  try {
    const { page } = f;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const toolbar = page.locator("[data-catalog-toolbar]");
    const search = toolbar.getByRole("searchbox");
    assert.equal(await toolbar.locator('svg[data-search-icon="leading"]').count(), 1);
    await search.fill("Fuji");
    const clear = toolbar.getByRole("button", { name: "Clear search", exact: true });
    assert.equal(await clear.evaluate(el => !!el.closest("[data-search-field]")), true);
    await page.setViewportSize({ width: 900, height: 800 }); await settle(page);
    const compactClear = (await clear.boundingBox())!;
    assert.ok(compactClear.width >= 44 && compactClear.height >= 44, "Adaptive compact toolbar keeps touch-sized clear");
    await page.setViewportSize({ width: 1280, height: 800 }); await settle(page);
    await clear.focus(); await page.keyboard.press("Enter");
    assert.equal(await search.inputValue(), "");
    assert.ok(await search.evaluate(el => el === document.activeElement));
    assert.ok(await page.locator("[data-catalog-search-scroll]").isVisible());
    await page.getByRole("button", { name: "Close search", exact: true }).click();
    await (await navigationAction(page, "Component bank")).click();
    const navigation = page.getByRole("navigation", { name: "Catalog navigation", exact: true });
    assert.equal(await navigation.getByRole("searchbox").count(), 0);
    assert.equal(await page.locator("[data-catalog-scroll] [data-search-field]").count(), 0);
    const collection = page.locator('[data-view-item="specimen:collection:records"]');
    assert.equal(await collection.getByRole("searchbox").count(), 0);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const find = toolbar.getByRole("searchbox", { name: "Search component bank", exact: true });
    await find.fill("collection");
    assert.equal(await toolbar.locator('svg[data-search-icon="leading"]').count(), 1);
    assert.equal(await toolbar.getByRole("button", { name: "Clear search", exact: true }).count(), 1);
    const overlay = page.locator("[data-catalog-search-scroll]");
    assert.equal(await overlay.locator('[data-focus-key="search:collection"]').count(), 1);
    const inventory = await page.locator("[data-view-item^='entry:']").count();
    assert.ok(inventory > 1, "query changes overlay results, not the underlying inventory");
    for (const scheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await settle(page);
      await mkdir(evidence, { recursive: true });
      await page.screenshot({ path: `${evidence}/overlay-${scheme}.png` });
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await find.fill("no-such-record");
      const accessory = toolbar.getByRole("button", { name: "Clear search", exact: true });
      await settle(page);
      const box = (await accessory.boundingBox())!;
      assert.ok(box.width >= 44 && box.height >= 44, "Compact clear is a touch target");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await accessory.click();
      assert.ok(await find.evaluate(el => el === document.activeElement));
      assert.equal(await find.inputValue(), "");
      assert.equal(await page.locator("[data-view-item^='entry:']").count(), inventory);
    }
    await page.getByRole("button", { name: "Close search", exact: true }).click();
    assert.equal(await page.getByRole("searchbox").count(), 0);
  } finally { await f.close(); }
});
