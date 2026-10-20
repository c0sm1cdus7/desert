import test from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

// Owner expectation: all search fields expose the same icon/accessory anatomy.
// Filtering, clearing, and closing remain distinct operations.
test("toolbar, catalog and collection share search anatomy without losing local scope", async () => {
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
    const find = navigation.getByRole("searchbox", { name: "Find component", exact: true });
    await find.fill("collection");
    assert.equal(await navigation.locator('svg[data-search-icon="leading"]').count(), 1);
    assert.equal(await navigation.getByRole("button", { name: "Clear search", exact: true }).count(), 1);
    const collection = page.locator('[data-specimen="collection:records"]');
    const local = collection.getByRole("searchbox", { name: "Search loaded records", exact: true });
    await local.fill("Fuji");
    assert.equal(await collection.locator('svg[data-search-icon="leading"]').count(), 1);
    assert.deepEqual(await collection.locator(".record-button strong").allTextContents(), ["Mount Fuji"]);
    for (const scheme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await local.scrollIntoViewIfNeeded(); await settle(page);
      await mkdir(evidence, { recursive: true });
      await collection.screenshot({ path: `${evidence}/collection-${scheme}.png` });
    }
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await local.fill("no-such-record");
      const accessory = collection.getByRole("button", { name: "Clear search", exact: true });
      await accessory.scrollIntoViewIfNeeded(); await settle(page);
      const box = (await accessory.boundingBox())!;
      assert.ok(box.width >= 44 && box.height >= 44, "Compact clear is a touch target");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await accessory.click();
      assert.ok(await local.evaluate(el => el === document.activeElement));
      assert.equal(await find.inputValue(), "collection", "Local clearing does not clear the catalog filter");
    }
  } finally { await f.close(); }
});
