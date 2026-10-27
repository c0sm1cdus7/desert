import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { selectionTrigger } from "./public-catalog-expectations.ts";

// The isolated Notebook host must consume the same native whole-well select as
// the public bank. This expectation replaces no legacy modal-selector tests.
test("Notebook catalog shares whole-well activation without coupling currency and amount", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  const build = basename(process.env.DESERT_WEB_BUILD ?? "current");
  const directory = `artifacts/field-well/${build}`;
  const observations: unknown[] = [];
  try {
    await mkdir(directory, { recursive: true });
    await openCatalog(f.page);
    const trigger = selectionTrigger(f.page, "Single choice"), menu = f.page.getByRole("listbox");
    assert.equal(await trigger.evaluate(element => element.matches("button[data-floating-field]")), true,
      "The visible field boundary itself is the native selection button");
    assert.equal(await trigger.locator("button,input,label").count(), 0, "No second nested interaction target");
    for (const region of ["label", "top padding"] as const) {
      await trigger.scrollIntoViewIfNeeded(); await settleMotion(f.page);
      const well = (await trigger.boundingBox())!;
      const point = region === "label"
        ? await trigger.locator('[data-slot="field-label"]').evaluate(element => {
          const box = element.getBoundingClientRect(); return { x: box.x + 8, y: box.y + box.height / 2 };
        })
        : { x: well.x + well.width / 2, y: well.y + 3 };
      await f.page.mouse.click(point.x, point.y); await menu.waitFor();
      assert.equal(await menu.getByRole("toolbar").count(), 0, "A flat selection has no modal toolbar");
      assert.equal(await f.page.getByRole("dialog", { name: "Single choice", exact: true }).count(), 0);
      observations.push({ region, opened: await menu.isVisible(), point });
      if (region === "label") await f.page.keyboard.press("Escape");
      else await menu.getByRole("option", { name: "Second option", exact: true }).click();
      await menu.waitFor({ state: "hidden" }); await settleMotion(f.page);
      assert.equal(await trigger.evaluate(element => element === document.activeElement), true,
        "Dismissal and direct commit return focus to the same whole-well native trigger");
    }
    assert.equal(await trigger.locator('[data-field-value]').innerText(), "Second option");
    await f.page.screenshot({ path: `${directory}/notebook-whole-well-selected.png` });

    const money = f.page.locator('[data-view-item="specimen:control.money:value"]');
    const amount = money.getByRole("textbox", { name: "Amount", exact: true });
    await amount.fill("123,40");
    await amount.blur();
    await money.locator('[data-slot="field-label"]').click();
    assert.equal(await amount.evaluate(element => element === document.activeElement), true,
      "The money label activates amount editing, not currency selection");
    assert.equal(await menu.count(), 0);
    await amount.click();
    assert.equal(await menu.count(), 0, "Amount editing does not open the currency popup");
    const currency = money.getByRole("button", { name: "ARS · Amount currency", exact: true });
    await currency.click(); await menu.waitFor();
    assert.equal(await amount.inputValue(), "123,40", "Opening currency preserves the lexical draft");
    await menu.getByRole("option", { name: "USD", exact: true }).click();
    await menu.waitFor({ state: "hidden" }); await settleMotion(f.page);
    assert.equal(await amount.inputValue(), "123,40", "Same-scale currency commit keeps trailing decimal zeroes");
    const selectedCurrency = money.getByRole("button", { name: "USD · Amount currency", exact: true });
    assert.equal(await selectedCurrency.evaluate(element => element === document.activeElement), true);
    await amount.click();
    assert.equal(await amount.evaluate(element => element === document.activeElement), true);
    assert.equal(await menu.count(), 0);
    observations.push({ selection: await trigger.locator('[data-field-value]').innerText(),
      currency: await selectedCurrency.innerText(), amount: await amount.inputValue(), errors: f.errors });
    await f.page.screenshot({ path: `${directory}/notebook-currency-amount-independent.png` });
    assert.deepEqual(f.errors, []);
  } finally {
    await writeFile(`${directory}/notebook-whole-well.json`, JSON.stringify({ build, observations }, null, 2) + "\n");
    await f.close();
  }
});
