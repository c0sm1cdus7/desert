// One disabled look for every field, plainly off (third review of the slice 3 package): a disabled date field read almost
// as an empty one, its faded value as grey as an empty field's placeholder, its calendar still offered. Every disabled
// field (a date, a one-line and a multiline input, a trigger) offers nothing to press: no calendar, no chevron, no clear;
// its content fades once; and its pane stays every pane's (law S1: disabled state belongs to content).
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("every disabled field offers nothing to press and fades its content, on the common pane", async () => {
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
        const shown = (element: Element) => element.getBoundingClientRect().width > 0 && element.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        // What a person is offered inside the well: a glyph at its end (calendar, chevron) or a button (a clear).
        const offered = [...well.querySelectorAll("svg, button")].filter(shown).length;
        let fade = 1;
        const content = well.querySelector("[data-field-row], [data-button-content]");
        for (let node: Element | null = content; node && node !== well.parentElement; node = node.parentElement) fade *= Number(getComputedStyle(node).opacity);
        return { case: scope.getAttribute("data-case")!, disabled: field.getAttribute("data-disabled") === "true", offered, fade: Math.round(fade * 100) / 100,
          ground: getComputedStyle(well).backgroundColor };
      }));
      const disabled = wells.filter(well => well.disabled), enabled = wells.filter(well => !well.disabled);
      const seen = JSON.stringify(wells);
      assert.ok(disabled.some(well => well.case.startsWith("date-")) && disabled.length >= 4, `${colorScheme}: the disabled witnesses: ${seen}`);
      for (const well of disabled) {
        assert.equal(well.offered, 0, `${colorScheme}: ${well.case} offers nothing to press while disabled: ${seen}`);
        assert.equal(well.fade, .5, `${colorScheme}: ${well.case} fades its content once: ${seen}`);
        assert.equal(well.ground, enabled[0]!.ground, `${colorScheme}: ${well.case} keeps every pane's ground`);
      }
      assert.ok(enabled.find(well => well.case === "date-empty")!.offered > 0, `${colorScheme}: an empty date still offers its calendar: ${seen}`);
      for (const well of enabled) assert.equal(well.fade, 1, `${colorScheme}: ${well.case} is not faded`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
