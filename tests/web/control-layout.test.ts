import assert from "node:assert/strict";
import test from "node:test";
import type { Locator } from "playwright";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

async function choiceGeometry(choice: Locator) {
  return choice.evaluate(element => {
    const label = document.querySelector(`label[for="${element.id}"]`)!;
    const nameId = element.getAttribute("aria-labelledby")?.split(/\s+/)[0];
    const name = nameId ? document.getElementById(nameId)! : label;
    const indicator = element.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const nameBox = name.getBoundingClientRect();
    const row = element.closest('[data-choice-row]')!.getBoundingClientRect();
    return { centerOffset: Math.abs(indicator.y + indicator.height / 2 - nameBox.y - nameBox.height / 2),
      labelHeight: labelBox.height, rowHeight: row.height,
      horizontalGap: nameBox.left - indicator.right,
      contained: nameBox.right <= row.right + 1 && indicator.left >= row.left - 1 };
  });
}

async function mediaGeometry(media: Locator) {
  return media.evaluate(element => {
    const box = element.getBoundingClientRect();
    const figure = element.closest("figure")!.getBoundingClientRect();
    return { width: box.width, height: box.height, ratio: box.width / box.height,
      contained: box.left >= figure.left - 1 && box.right <= figure.right + 1 };
  });
}

test("option indicators align with their interactive labels at compact widths and enlarged text", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    for (const width of [1280, 390, 320]) {
      await f.page.setViewportSize({ width, height: 900 });
      for (const scale of [1, 1.3]) {
        await f.page.evaluate(value => document.documentElement.style.setProperty("--text-scale", String(value)), scale);
        await settleMotion(f.page);
        const rhythms: number[] = [];
        for (const cardinality of ["one", "many"] as const) {
          const specimen = f.page.locator(`[data-specimen="control.options:${cardinality}"]`);
          const choices = specimen.getByRole(cardinality === "one" ? "radio" : "checkbox");
          assert.equal(await choices.count(), 3);
          const rows = await specimen.locator('[data-choice-row]').evaluateAll(elements => elements.map(element => {
            const box = element.getBoundingClientRect();
            return { top: box.top, bottom: box.bottom };
          }));
          rhythms.push(rows[1]!.top - rows[0]!.bottom);
          for (const choice of await choices.all()) {
            const geometry = await choiceGeometry(choice);
            const context = `${cardinality}, ${width}px, text scale ${scale}: ${JSON.stringify(geometry)}`;
            assert.ok(geometry.centerOffset <= 1, `indicator and label centers align: ${context}`);
            assert.ok(geometry.labelHeight >= 44 && geometry.rowHeight >= 44, `44px label target: ${context}`);
            assert.ok(geometry.horizontalGap > 0 && geometry.contained, `side-by-side contained controls: ${context}`);
          }
        }
        assert.ok(Math.abs(rhythms[0]! - rhythms[1]!) <= 1, "cardinality does not change option spacing");
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("option label activation, keyboard selection and disabled semantics survive shared composition", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const single = f.page.locator('[data-specimen="control.options:one"]');
    const many = f.page.locator('[data-specimen="control.options:many"]');
    assert.equal(await single.getByRole("radiogroup", { name: "Choose one option", exact: true }).count(), 1);
    for (const [specimen, role] of [[single, "radio"], [many, "checkbox"]] as const) {
      const first = specimen.getByRole(role, { name: "First option", exact: true });
      const label = specimen.locator(`label[for="${await first.getAttribute("id")}"]`);
      await label.click({ position: { x: 4, y: 4 } });
      assert.equal(await first.isChecked(), true, "the label's full target activates its control");
      assert.equal(await specimen.getByRole(role, { name: "Unavailable option", exact: true }).isDisabled(), true);
      await first.focus();
      await f.page.keyboard.press(role === "radio" ? "ArrowDown" : "Space");
      assert.equal(await first.isChecked(), false);
      if (role === "radio") assert.equal(await specimen.getByRole(role, { name: "Second option", exact: true }).isChecked(), true);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("loaded and absent image sources preserve the declared landscape ratio", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    for (const width of [1280, 390, 320]) {
      await f.page.setViewportSize({ width, height: 900 });
      await settleMotion(f.page);
      for (const state of ["available", "unavailable"]) {
        const specimen = f.page.locator(`[data-specimen="control.image:${state}"]`);
        const media = specimen.getByRole("img", { name: "An open notebook with blue pages", exact: true });
        const geometry = await mediaGeometry(media);
        assert.ok(Math.abs(geometry.ratio - 16 / 9) < .01, `${state} at ${width}px: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.contained, `${state} stays inside its figure`);
        assert.equal(await specimen.locator("figcaption").textContent(), "Notebook cover");
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a failed image request preserves the same media geometry and accessible alternative", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const specimen = f.page.locator('[data-specimen="control.image:available"]');
    const loaded = specimen.getByRole("img", { name: "An open notebook with blue pages", exact: true });
    assert.equal(await loaded.evaluate(element => (element as HTMLImageElement).naturalWidth > 0), true);
    const before = await mediaGeometry(loaded);
    await f.page.route("**/bank-image.svg", route => route.abort());
    await f.page.reload();
    await openCatalog(f.page);
    await specimen.getByText("Image unavailable", { exact: true }).waitFor();
    const fallback = specimen.getByRole("img", { name: "An open notebook with blue pages", exact: true });
    const after = await mediaGeometry(fallback);
    assert.ok(Math.abs(before.width - after.width) <= 1 && Math.abs(before.height - after.height) <= 1,
      `source failure must not reflow the media frame: ${JSON.stringify({ before, after })}`);
    assert.ok(Math.abs(after.ratio - 16 / 9) < .01);
    assert.equal(await specimen.locator("figcaption").textContent(), "Notebook cover");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
