import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";

for (const colorScheme of ["light", "dark"] as const) test(`frozen bank masks exact money and keeps bare currency symbols at compact widths (${colorScheme})`, async () => {
  const f = await publicCatalogFixture();
  const directory = `artifacts/money-mask/${process.env.DESERT_EVIDENCE_PHASE ?? "final"}`;
  try {
    const { page } = f;
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await (await navigationAction(page, "Component bank")).click();
    const find = page.getByRole("searchbox", { name: "Find component", exact: true });
    await find.fill("control.money");
    const specimen = page.locator('[data-view-item="specimen:control.money:empty"]');
    const amount = specimen.getByRole("textbox", { name: "Amount", exact: true });
    await amount.fill("423423423,25");
    assert.equal(await amount.inputValue(), "423.423.423,25");
    assert.equal(await amount.getAttribute("aria-invalid"), "false");
    await find.fill("input.text"); await find.fill("control.money");
    assert.equal(await amount.inputValue(), "423.423.423,25", "filtering keeps the mounted exact draft");
    const currency = () => specimen.getByRole("button", { name: / · Amount currency$/ });
    assert.equal(await currency().locator('[data-choice-symbol]').innerText(), "$");
    await currency().click();
    await page.getByRole("option", { name: "USD", exact: true }).click();
    assert.equal(await amount.inputValue(), "423.423.423,25", "currency selection is not an FX conversion or reset");
    assert.equal(await currency().locator('[data-choice-symbol]').innerText(), "$");
    await mkdir(directory, { recursive: true });
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await amount.scrollIntoViewIfNeeded(); await currency().click(); await settle(page);
      const panel = page.getByRole("listbox");
      const geometry = await panel.boundingBox();
      assert.ok(geometry && geometry.x >= -1 && geometry.x + geometry.width <= width + 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await panel.getByRole("option", { name: "ARS", exact: true }).locator('[data-choice-symbol]').innerText(), "$" );
      assert.equal(await panel.getByRole("option", { name: "ARS", exact: true })
        .locator('[data-piece="face"]').count(), 0);
      await page.screenshot({ path: `${directory}/catalog-${colorScheme}-${width}.png`, animations: "disabled" });
      await page.keyboard.press("Escape");
      assert.ok(await currency().evaluate(element => element === document.activeElement));
    }
  } finally { await f.close(); }
});
