import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import type { Locator, Page } from "playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, selectionTrigger, settle } from "./public-catalog-expectations.ts";

async function capture(page: Page, specimen: Locator, kind: string, scheme: string) {
  const directory = `artifacts/input-clear/${process.env.DESERT_EVIDENCE_PHASE ?? "final"}`;
  await mkdir(directory, { recursive: true });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const clear = specimen.locator("[data-input-clear]");
    await clear.scrollIntoViewIfNeeded(); await settle(page);
    const geometry = await specimen.evaluate(element => {
      const editor = element.querySelector("input,textarea")!.getBoundingClientRect();
      const clear = element.querySelector("[data-input-clear]")!.getBoundingClientRect();
      const well = element.querySelector("[data-floating-field]")!.getBoundingClientRect();
      return { separated: editor.right <= clear.left, inside: clear.right <= well.right && clear.bottom <= well.bottom,
        width: clear.width, height: clear.height };
    });
    assert.ok(geometry.separated && geometry.inside, `${kind} clear has reserved space inside the well`);
    if (width < 768) assert.ok(geometry.width >= 44 && geometry.height >= 44, "Compact clear is a touch target");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${directory}/${kind}-${scheme}-${width}.png`, animations: "disabled" });
    if (kind === "money") {
      const labelLines = await specimen.locator('[data-slot="field-label"]').evaluate(label => {
        const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === "Amount")!;
        const range = document.createRange(); range.selectNodeContents(text);
        return range.getClientRects().length;
      });
      assert.equal(labelLines, 1, `The short Amount label must not wrap mid-word at ${width}px`);
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}

for (const scheme of ["light", "dark"] as const) test(`frozen inputs share clear without clearing popovers or search scope (${scheme})`, async () => {
  const f = await publicCatalogFixture();
  try {
    const { page } = f;
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await (await navigationAction(page, "Component bank")).click();
    const find = page.getByRole("searchbox", { name: "Find component", exact: true });
    for (const primitive of ["input.text", "input.multiline"]) {
      await find.fill(primitive);
      const specimen = page.locator(`[data-view-item="specimen:${primitive}:value"]`);
      const editor = specimen.getByRole("textbox");
      const clear = specimen.getByRole("button", { name: "Clear Local writing example", exact: true });
      await editor.fill("A thought worth keeping 💡");
      await find.fill("control.money"); await find.fill(primitive);
      assert.equal(await editor.inputValue(), "A thought worth keeping 💡", "Filtering preserves the mounted draft");
      await capture(page, specimen, primitive, scheme);
      await clear.focus(); await page.keyboard.press("Enter");
      assert.equal(await editor.inputValue(), "");
      assert.equal(await clear.count(), 0);
      assert.ok(await editor.evaluate(element => element === document.activeElement));
      if (primitive === "input.multiline") assert.equal(await specimen.locator("[data-character-counter]").innerText(), "280 remaining");
      await editor.fill("   "); await clear.click();
      assert.equal(await editor.inputValue(), "", "Whitespace is also clearable");
      assert.equal(await find.inputValue(), primitive, "Clearing a specimen does not clear the catalog filter");
    }
    await find.fill("control.money");
    const money = page.locator('[data-view-item="specimen:control.money:empty"]');
    const amount = money.getByRole("textbox", { name: "Amount", exact: true });
    const currency = money.getByRole("button", { name: / · Amount currency$/ });
    await currency.click(); await page.getByRole("option", { name: "USD", exact: true }).click();
    await amount.fill("12345,67");
    assert.equal(await amount.inputValue(), "12.345,67");
    await capture(page, money, "money", scheme);
    await money.getByRole("button", { name: "Clear Amount", exact: true }).click();
    assert.equal(await amount.inputValue(), "");
    assert.match(await currency.innerText(), /USD/);
    assert.ok(await amount.evaluate(element => element === document.activeElement));
    assert.equal(await money.locator("[data-input-clear]").count(), 0);
    await amount.fill("12");
    await amount.fill("1,234");
    assert.equal(await amount.inputValue(), "12", "Impossible precision preserves the accepted draft");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    await money.getByRole("button", { name: "Clear Amount", exact: true }).click();
    assert.equal(await amount.inputValue(), "");
    assert.equal(await amount.getAttribute("aria-invalid"), "false", "Clear works after a rejected edit");

    await find.fill("control.select");
    const selection = page.locator('[data-view-item="specimen:control.select:available"]');
    await selectionTrigger(page, "Single choice").click();
    await page.getByRole("option", { name: "Second option", exact: true }).click();
    assert.match(await selection.innerText(), /Second option/);
    assert.equal(await selection.locator("[data-input-clear]").count(), 0);
    await find.fill("control.date");
    const calendar = page.locator('[data-view-item="specimen:control.date:calendar"]');
    await calendar.waitFor({ state: "visible" });
    assert.equal(await calendar.locator("[data-input-clear]").count(), 0);

    await find.fill("collection");
    const collection = page.locator('[data-view-item="specimen:collection:records"]');
    const local = collection.getByRole("searchbox", { name: "Search loaded records", exact: true });
    await local.fill("Fuji");
    await collection.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await local.inputValue(), "");
    assert.equal(await find.inputValue(), "collection");
    assert.equal(await page.getByRole("button", { name: "Search", exact: true }).count(), 0,
      "The bank owns one inline search, not a duplicate global search affordance");
    await page.locator("#catalog-navigation").getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await find.inputValue(), "");
    assert.ok(await find.evaluate(element => element === document.activeElement));
    await find.fill("collection");
    await (await navigationAction(page, "Landmarks")).click();
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const toolbar = page.locator("[data-catalog-toolbar]");
    const search = toolbar.getByRole("searchbox");
    await search.fill("collection");
    await toolbar.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await search.inputValue(), "");
    assert.ok(await search.evaluate(element => element === document.activeElement));
    assert.ok(await page.locator("[data-catalog-search-scroll]").isVisible());
    await page.getByRole("button", { name: "Close search", exact: true }).click();
    await (await navigationAction(page, "Component bank")).click();
    assert.equal(await find.inputValue(), "collection", "Toolbar clear does not reset catalog filtering");
  } finally { await f.close(); }
});
