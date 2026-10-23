import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("text, amount and selection share one field well while choices retain shadcn field anatomy", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const text = f.page.locator('[data-specimen="input.text:value"]');
    const money = f.page.locator('[data-specimen="control.money:value"]');
    const select = f.page.locator('[data-control="select"]').filter({
      has: f.page.getByRole("button", { name: /^Single choice ·/ }),
    });
    for (const width of [1280, 390, 320]) {
      await f.page.setViewportSize({ width, height: 900 });
      await settleMotion(f.page);
      const heights: number[] = [], rowStyles: unknown[] = [];
      for (const field of [text, money, select]) {
        const well = field.locator('[data-floating-field]');
        assert.equal(await well.count(), 1, "one shared field well owns the boundary");
        assert.equal(await well.locator('[data-field-well] > [data-slot="input-group-control"], [data-field-value]').count(), 1);
        assert.equal(await well.locator('[data-slot="field-label"]').count(), 1);
        const geometry = await well.evaluate(element => {
          const box = element.getBoundingClientRect();
          const control = element.querySelector('[data-slot="input-group-control"], [data-field-value]')!;
          const style = getComputedStyle(control);
          return { height: box.height, controlSize: parseFloat(style.fontSize),
            innerBorder: parseFloat(style.borderTopWidth), contained: box.right <= innerWidth + 1 };
        });
        heights.push(geometry.height);
        assert.equal(geometry.controlSize, 16, "editing text retains a legible mobile-safe size");
        assert.equal(geometry.innerBorder, 0, "the inner control cannot introduce a second box");
        assert.equal(geometry.contained, true);
        rowStyles.push(await well.evaluate(element => {
          const style = getComputedStyle(element.querySelector('[data-slot="input-group-control"], [data-field-value]')!);
          return { lineHeight: style.lineHeight, padding: style.padding, minHeight: style.minHeight };
        }));
      }
      assert.deepEqual(rowStyles[1], rowStyles[0], "compound money uses the same editing-row geometry");
      assert.deepEqual(rowStyles[2], rowStyles[0], "selection uses the same editing-row geometry");
      if (width === 1280) assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, `wide field heights: ${heights}`);
      else {
        assert.ok(heights[0]! >= 62 && heights[1]! >= 62 && heights[2]! >= 62,
          "narrow fields can grow to retain accessible clear targets and compound currency rows");
        const regions = await money.locator('[data-floating-field]').evaluate(element => ({
          prefix: element.querySelector('.field-prefix')!.getBoundingClientRect().toJSON(),
          editor: element.querySelector('[data-slot="input-group-control"]')!.getBoundingClientRect().toJSON(),
        }));
        assert.ok(regions.prefix.bottom <= regions.editor.top + 1 || regions.prefix.right <= regions.editor.left + 1,
          "compound currency stays beside the amount when it fits, otherwise reflows above without overlap");
      }
      const currency = money.getByRole("button", { name: "ARS · Amount currency", exact: true });
      assert.equal(await currency.evaluate(element => getComputedStyle(element).borderTopWidth), "0px");
      for (const cardinality of ["one", "many"]) {
        const options = f.page.locator(`[data-specimen="control.options:${cardinality}"]`);
        assert.equal(await options.locator('[data-slot="field-label"][data-choice-row] > [data-choice-anatomy]').count(), 3);
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
