// One disabled look for every field, plainly off (third review of the slice 3 package): a disabled date field read almost
// as an empty one, its faded value as grey as an empty field's placeholder. Every disabled field (a date, a one-line and a
// multiline input, a trigger) stands on the same recessed muted ground, unlike any enabled well, with its content faded once.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("every disabled field stands on one recessed ground, unlike an enabled or empty well", async () => {
  const f = await mounted(`<main style="padding:16px;display:grid;gap:12px;width:358px;background:var(--background)">
  {#each DateControlSpecimens as specimen}<div data-case="date-{specimen.state}"><Catalog.DateControl {...specimen.props} /></div>{/each}
  {#each FieldSpecimens.filter(s => s.variants?.measure === "fill") as specimen}<div data-case="field-{specimen.state}-{specimen.variants?.primitive}"><Catalog.Field {...specimen.props} /></div>{/each}
  </main>`, `  import { DateControlSpecimens } from "@desert/svelte/catalog/foundations/date-control/date-control.specimens.ts";
  import { FieldSpecimens } from "@desert/svelte/catalog/foundations/field/field.specimens.ts";`);
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      await f.page.setViewportSize({ width: 390, height: 900 });
      const wells = await f.page.evaluate(() => [...document.querySelectorAll("[data-case]")].filter(scope => scope.querySelector(".field-well")).map(scope => {
        const well = scope.querySelector(".field-well")!, field = well.closest('[data-slot="field"]')!;
        return { case: scope.getAttribute("data-case")!, disabled: field.getAttribute("data-disabled") === "true", ground: getComputedStyle(well).backgroundColor,
          border: getComputedStyle(well).borderTopColor };
      }));
      const disabled = wells.filter(well => well.disabled), enabled = wells.filter(well => !well.disabled);
      const seen = JSON.stringify(wells);
      assert.ok(disabled.some(well => well.case.startsWith("date-")) && disabled.length >= 4, `${colorScheme}: the disabled witnesses: ${seen}`);
      assert.equal(new Set(disabled.map(well => well.ground)).size, 1, `${colorScheme}: every disabled field stands on one ground: ${seen}`);
      for (const well of enabled) assert.notEqual(well.ground, disabled[0]!.ground, `${colorScheme}: ${well.case} (enabled) does not look disabled: ${seen}`);
      // The boundary stays: a disabled well keeps every well's hairline.
      for (const well of disabled) assert.equal(well.border, enabled[0]!.border, `${colorScheme}: ${well.case} keeps the well's hairline`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
