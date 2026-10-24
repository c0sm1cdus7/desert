import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction } from "./public-catalog-expectations.ts";

for (const colorScheme of ["light", "dark"] as const) test(`frozen collection and choice rows align their content (${colorScheme})`, async () => {
  const f = await publicCatalogFixture();
  const directory = "artifacts/row-alignment/frozen";
  try {
    const { page } = f;
    await mkdir(directory, { recursive: true });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await (await navigationAction(page, "Component bank")).click();
    const filter = page.getByRole("searchbox", { name: "Find component", exact: true });
    const observations = [];
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await filter.fill("collection");
      await page.getByRole("searchbox", { name: "Search loaded records", exact: true }).fill("Uyuni");
      const row = page.getByRole("button", { name: "Uyuni Salt Flat", exact: true });
      await row.scrollIntoViewIfNeeded();
      const geometry = await row.evaluate(button => {
        const center = (element: Element) => { const r = element.getBoundingClientRect(); return r.y + r.height / 2; };
        return { row: center(button), title: center(button.querySelector(".row-label")!),
          icon: center(button.querySelector("svg")!), height: button.getBoundingClientRect().height,
          emptyMetadata: button.querySelector(".row-metadata") !== null };
      });
      assert.ok(Math.abs(geometry.title - geometry.row) < .1);
      assert.ok(Math.abs(geometry.icon - geometry.row) < .1);
      assert.ok(geometry.height >= 44);
      assert.equal(geometry.emptyMetadata, false);
      await page.screenshot({ path: `${directory}/${colorScheme}-${width}.png` });
      await filter.fill("control.options");
      const choices = await page.locator('[data-specimen="control.options:one"] [data-choice-row], [data-specimen="control.options:many"] [data-choice-row]').evaluateAll(rows => rows.map(row => {
        const control = row.querySelector('[role="radio"],[role="checkbox"]')!.getBoundingClientRect();
        const text = row.querySelector('[data-slot="field-content"]')!.getBoundingClientRect();
        return control.y + control.height / 2 - text.y - text.height / 2;
      }));
      assert.equal(choices.length, 6);
      for (const difference of choices) assert.ok(Math.abs(difference) < .1);
      observations.push({ width, geometry, choiceCenterDifferences: choices });
    }
    await writeFile(`${directory}/${colorScheme}.json`, JSON.stringify(observations, null, 2));
    f.diagnostics.assertClean();
  } finally { await f.close(); }
});
