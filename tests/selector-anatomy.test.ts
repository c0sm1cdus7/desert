// One selector-field anatomy (law 9b; second review of the slice 3 package): the media selector showed its label above a
// value-only well while the reference selector shows «label · value» inside its well. Both open from Field's trigger with
// its label visible inside the well, no group legend above it, at the same measure: the same well, side by side.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("media and reference selectors share one trigger anatomy: label · value inside the well", async () => {
  const f = await mounted(`<div style="width:354px" data-media><MediaReferenceSpecimen /></div>
  <div style="width:354px" data-reference><Catalog.ReferenceSelector node={{ version: "desert.control/1", kind: "labels", id: "projects",
    label: "Projects", disabled: false, values: [], limits: { maxItems: 12, maxLength: 36 },
    reference: { options: [], loading: false, busy: false, uncertain: false, colors: [], maxLength: 64 } }} onevent={() => {}} /></div>`,
  `  import MediaReferenceSpecimen from "@desert/svelte/catalog/compositions/media-reference-specimen/MediaReferenceSpecimen.svelte";`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 700 });
      const read = (scope: string) => f.page.locator(scope).evaluate(host => {
        const trigger = host.querySelector("[data-field-trigger]");
        const label = trigger?.querySelector('[data-slot="field-label"]');
        const box = trigger?.getBoundingClientRect(), hostBox = host.getBoundingClientRect();
        return { trigger: !!trigger, labelInside: !!label && !label.classList.contains("sr-only"),
          legends: [...host.querySelectorAll("legend")].filter(legend => !legend.classList.contains("sr-only") && legend.closest("[data-field-trigger]") === null).length,
          left: box ? Math.round(box.left - hostBox.left) : NaN, width: box ? Math.round(box.width) : NaN,
          labelSize: label ? getComputedStyle(label).fontSize : "", measure: trigger?.closest("[data-measure]")?.getAttribute("data-measure") ?? null };
      });
      const [media, reference] = [await read("[data-media]"), await read("[data-reference]")];
      assert.deepEqual(media, reference, `${width}: the media selector's trigger is the reference selector's`);
      assert.equal(media.labelInside, true, `${width}: the label reads inside the well`);
      assert.equal(media.legends, 0, `${width}: no group legend above the well`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
