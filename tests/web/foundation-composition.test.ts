import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { browserFixture, settleMotion } from "./fixture.ts";

test("text, amount and selection share one field well while choices retain shadcn field anatomy", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const text = f.page.locator('[data-specimen="input.text:value"]');
    const money = f.page.locator('[data-control="money"]');
    const select = f.page.locator('[data-control="select"]').filter({
      has: f.page.getByRole("button", { name: "Single choice", exact: true }),
    });
    for (const width of [1280, 390, 320]) {
      await f.page.setViewportSize({ width, height: 900 });
      await settleMotion(f.page);
      const heights: number[] = [];
      for (const field of [text, money, select]) {
        const well = field.locator('[data-slot="input-group"][data-floating-field]');
        assert.equal(await well.count(), 1, "one shared shadcn InputGroup owns the field boundary");
        assert.equal(await well.locator('[data-field-well] > [data-slot="input-group-control"]').count(), 1);
        assert.equal(await well.locator('[data-slot="field-label"]').count(), 1);
        const geometry = await well.evaluate(element => {
          const box = element.getBoundingClientRect();
          const control = element.querySelector('[data-slot="input-group-control"]')!;
          const style = getComputedStyle(control);
          return { height: box.height, controlSize: parseFloat(style.fontSize),
            innerBorder: parseFloat(style.borderTopWidth), contained: box.right <= innerWidth + 1 };
        });
        heights.push(geometry.height);
        assert.equal(geometry.controlSize, 16, "editing text retains a legible mobile-safe size");
        assert.equal(geometry.innerBorder, 0, "the inner control cannot introduce a second box");
        assert.equal(geometry.contained, true);
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, `shared field height: ${heights}`);
      const currency = money.getByRole("button", { name: "ARS · Amount currency", exact: true });
      assert.equal(await currency.evaluate(element => getComputedStyle(element).borderTopWidth), "0px");
      for (const cardinality of ["one", "many"]) {
        const options = f.page.locator(`[data-specimen="control.options:${cardinality}"]`);
        assert.equal(await options.locator('[data-slot="field-label"] > [data-slot="field"]').count(), 3);
      }
    }
    const directory = `artifacts/composition-repair/${process.env.DESERT_VISUAL_PHASE ?? "current"}`;
    await mkdir(directory, { recursive: true });
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      await f.page.setViewportSize({ width: 1280, height: 900 });
      await settleMotion(f.page);
      await money.screenshot({ path: `${directory}/money-${colorScheme}.png` });
      const options = f.page.locator('[data-specimen="control.options:one"]');
      await options.locator("..").screenshot({ path: `${directory}/options-${colorScheme}.png` });
      await f.page.locator('[data-specimen="control.image:available"]').locator("..").screenshot({
        path: `${directory}/images-${colorScheme}.png`,
      });
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
