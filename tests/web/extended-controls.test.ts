import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("one and many options derive accessible radio and checkbox interaction", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const single = f.page.locator('[data-specimen="control.options:one"]');
    const many = f.page.locator('[data-specimen="control.options:many"]');
    const first = single.getByRole("radio", { name: "First option", exact: true });
    await first.click();
    assert.equal(await first.isChecked(), true);
    await f.page.keyboard.press("ArrowDown");
    assert.equal(await single.getByRole("radio", { name: "Second option", exact: true }).isChecked(), true);
    assert.equal(await first.isChecked(), false);
    assert.equal(await single.getByRole("radio", { name: "Unavailable option" }).isDisabled(), true);
    for (const name of ["First option", "Second option"]) await many.getByRole("checkbox", { name, exact: true }).check();
    assert.equal(await many.getByRole("checkbox", { checked: true }).count(), 2);
    await many.getByRole("checkbox", { name: "First option", exact: true }).uncheck();
    assert.equal(await many.getByRole("checkbox", { checked: true }).count(), 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("money validates exact precision and currency changes never silently convert", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const money = f.page.locator('[data-specimen="control.money:value"]');
    const amount = money.getByRole("textbox", { name: "Amount", exact: true });
    await amount.fill("9007199254740993,07");
    assert.equal((await amount.inputValue()).replaceAll(".", ""), "9007199254740993,07");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    const exact = await amount.inputValue();
    await amount.fill("1,005");
    assert.equal(await amount.inputValue(), exact, "an impossible precision edit preserves the previous exact value");
    await amount.fill("-");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    assert.equal(await money.getByRole("status").isVisible(), true);
    await money.getByRole("button", { name: "ARS · Amount currency", exact: true }).click();
    await f.page.getByRole("option", { name: "USD", exact: true }).click();
    assert.equal(await amount.inputValue(), "-", "a currency change cannot discard incomplete writing");
    assert.equal(await money.getByRole("button", { name: "ARS · Amount currency", exact: true }).count(), 1,
      "a non-representable amount keeps its currency until the user corrects it");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    await amount.fill("1,05");
    await money.getByRole("button", { name: "ARS · Amount currency", exact: true }).click();
    await f.page.getByRole("option", { name: "USD", exact: true }).click();
    assert.equal(await amount.inputValue(), "1,05", "a representable amount is not converted or rounded");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("calendar, tags and media remain accessible and contained at narrow widths", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const date = f.page.locator('[data-specimen="control.date:calendar"] [data-field-trigger]');
    await date.click();
    const calendar = f.page.getByRole("dialog", { name: "Date", exact: true });
    assert.equal(await calendar.getByRole("application", { name: "Date October 2026", exact: true }).count(), 1,
      "the calendar's accessible name derives from the typed label, never the vendor placeholder");
    await calendar.getByRole("button", { name: /Friday, October 16, 2026/ }).click();
    await calendar.waitFor({ state: "hidden" });
    assert.match(await date.innerText(), /Oct 16, 2026/);
    assert.equal(await f.page.locator('[data-catalog-entry="control.tag"] [data-control="tag"]').count(), 5);
    const image = f.page.locator('[data-specimen="control.image:available"] img');
    assert.equal(await image.evaluate(node => (node as HTMLImageElement).naturalWidth > 0), true);
    assert.equal(await f.page.locator('[data-specimen="control.image:unavailable"]').getByRole("img").isVisible(), true);
    assert.equal(await f.page.locator('[data-specimen="control.avatar:fallback"]').getByText("SL", { exact: true }).isVisible(), true);
    for (const width of [390, 320]) {
      await f.page.setViewportSize({ width, height: 844 });
      await settleMotion(f.page);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no horizontal overflow at ${width}`);
    }
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      await settleMotion(f.page);
      assert.deepEqual((await new AxeBuilder({ page: f.page }).include("[data-control-bench]").analyze()).violations, [], colorScheme);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
