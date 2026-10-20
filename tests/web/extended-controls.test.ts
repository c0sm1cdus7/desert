import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

test("one and many options derive accessible radio and checkbox interaction", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
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
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const money = f.page.locator('[data-control="money"]');
    const amount = money.getByRole("textbox", { name: "Amount", exact: true });
    await amount.fill("9007199254740993.07");
    assert.equal(await amount.inputValue(), "9007199254740993.07");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    await amount.fill("1.005");
    assert.equal(await amount.getAttribute("aria-invalid"), "true");
    assert.equal(await money.getByRole("status").isVisible(), true);
    await money.getByRole("button", { name: "ARS · Amount currency", exact: true }).click();
    await f.page.getByRole("radio", { name: "USD", exact: true }).click();
    assert.equal(await amount.inputValue(), "1.005", "a staged currency must preserve even invalid writing");
    await f.page.getByRole("dialog", { name: "Amount currency", exact: true }).getByRole("button", { name: "Confirm", exact: true }).click();
    assert.equal(await amount.inputValue(), "");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("calendar, tags and media remain accessible and contained at narrow widths", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const calendar = f.page.locator('[data-control="date"]');
    assert.equal(await calendar.getByRole("application", { name: "Date October 2026", exact: true }).count(), 1,
      "the calendar's accessible name derives from the typed label, never the vendor placeholder");
    await calendar.getByRole("button", { name: /Friday, October 16, 2026/ }).click();
    assert.equal(await calendar.getByRole("status").textContent(), "2026-10-16");
    assert.equal(await f.page.locator('[data-control="tag"]').count(), 5);
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
