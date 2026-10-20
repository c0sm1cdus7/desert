import test from "node:test";
import assert from "node:assert/strict";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { evidence, navigationAction, settle } from "./public-catalog-expectations.ts";

test("the public bank reuses inventory search, preserves drafts and returns from detail to its actual origin", async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await (await navigationAction(page, "Component bank")).click();
    const find = page.getByRole("searchbox", { name: "Find component", exact: true });
    const writing = page.locator('[data-specimen="input.text:value"]').getByRole("textbox");
    await writing.fill("Preserve this specimen");
    await find.fill("money");
    assert.equal(await page.locator("[data-catalog-entry]:visible").count(), 1);
    assert.ok(await page.locator('[data-catalog-entry="control.money"]').isVisible());
    await find.fill("");
    assert.equal(await writing.inputValue(), "Preserve this specimen");
    const navigation = page.getByRole("navigation", { name: "Catalog navigation", exact: true });
    await navigation.getByRole("link", { name: /^Controls/ }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "catalog-controls");
    await page.getByRole("region", { name: "Controls", exact: true })
      .getByRole("link", { name: "Back to catalog navigation", exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "catalog-search");
    await find.fill("collection");
    const opener = page.locator('[data-specimen="collection:records"]').getByRole("button", { name: "Alps", exact: true });
    await opener.click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    assert.ok(await page.getByRole("heading", { name: "Component bank", exact: true }).isVisible());
    assert.equal(await find.inputValue(), "collection");
    assert.ok(await opener.evaluate(element => element === document.activeElement));
    await find.fill("");
    assert.equal(await writing.inputValue(), "Preserve this specimen");
    await page.setViewportSize({ width: 1280, height: 800 });
    await find.fill("collection");
    await page.locator('[data-specimen="collection:records"]').getByRole("button", { name: "Alps", exact: true })
      .evaluate(element => element.scrollIntoView({ block: "center" }));
    await settle(page);
    await evidence(page, "bank-collection-grouped", { viewport: page.viewportSize(), approval: "pending", diagnostics: fixture.diagnostics.snapshot() });
    await find.fill("control.options");
    await page.getByRole("heading", { name: "Options", exact: true }).scrollIntoViewIfNeeded();
    await settle(page);
    await evidence(page, "bank-options-grouped", { viewport: page.viewportSize(), approval: "pending", diagnostics: fixture.diagnostics.snapshot() });
  } finally { await fixture.close(); }
});
