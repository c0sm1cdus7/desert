// One axis for every group heading, and a tag rail on it (law 9b; third review of the slice 3 package). The second
// review moved the «Labels» heading out to the group's edge where its tags stood, so «Labels» read 16px left of every
// other group heading and the same tags stood at the edge on one page and on the row inset on the other. Every group
// heading starts on the 1rem row inset where its rows and text read; the tags and «Add label» of a labels field stand
// on that same axis, and a tag rail shown by itself (the Label rail example) puts its tags there too.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("labels field and label rail: one group-heading axis, and the tags on it", async () => {
  const f = await mounted(`<div style="width:354px" data-probe>
    <LabelsControl node={{ version: "desert.control/1", kind: "labels", id: "labels", label: "Labels", disabled: false,
      values: ["Design", "Research"], limits: { maxItems: 12, maxLength: 64 } }} onevent={() => {}} />
  </div>
  <div style="width:354px" data-row>
    <Catalog.StackLayout title="Contract"><Catalog.Information items={[{ kind: "fact", label: "Owner", value: "LabelsControl" }]} /></Catalog.StackLayout>
  </div>
  <div style="width:354px" data-rail><Catalog.SharedOwnerSpecimen owner="LabelRail" /></div>
  <div style="width:354px" data-field><Catalog.SharedOwnerSpecimen owner="LabelsControl" /></div>`,
  `  import LabelsControl from "@desert/svelte/catalog/compositions/labels-control/LabelsControl.svelte";`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 1000 });
      const left = await f.page.evaluate(() => {
        const text = (scope: Element, words: string) => { const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent?.trim() === words) {
            const range = document.createRange(); range.selectNodeContents(node); return Math.round(range.getBoundingClientRect().left); }
          return NaN; };
        const at = (selector: string) => document.querySelector(selector)!;
        const from = (scope: Element, x: number) => x - Math.round(scope.getBoundingClientRect().left);
        const edge = (scope: Element, selector: string) => from(scope, Math.round(scope.querySelector(selector)!.getBoundingClientRect().left));
        const probe = at("[data-probe]"), row = at("[data-row]"), rail = at("[data-rail]"), field = at("[data-field]");
        return { heading: from(probe, text(probe, "Labels")), tag: edge(probe, '[data-slot="badge"]'), add: edge(probe, 'button[aria-label="Add label"]'),
          rowHeading: from(row, text(row, "Contract")), rowText: from(row, text(row, "Owner")),
          railTag: edge(rail, '[data-slot="badge"]'), fieldTag: edge(field, '[data-slot="badge"]'), fieldHeading: from(field, text(field, "Labels")),
          interaction: from(field, text(field, "Interaction")) };
      });
      const seen = JSON.stringify(left);
      // (the row's text sits inside the list's 1px border)
      assert.ok(Math.abs(left.rowHeading - left.rowText) <= 1, `${width}: a heading over rows keeps their text's row inset: ${seen}`);
      assert.equal(left.heading, left.rowHeading, `${width}: «Labels» starts where every other group heading starts: ${seen}`);
      assert.equal(left.tag, left.heading, `${width}: the tags stand on their heading's axis: ${seen}`);
      assert.equal(left.add, left.heading, `${width}: «Add label» stands on its heading's axis: ${seen}`);
      assert.equal(left.fieldHeading, left.interaction, `${width}: on the Labels field page, «Labels» and «Interaction» start on one axis: ${seen}`);
      assert.equal(left.fieldTag, left.railTag, `${width}: the same tags stand at the same place on the Labels field and Label rail pages: ${seen}`);
      assert.equal(left.railTag, left.interaction, `${width}: the Label rail's tags stand on the group-heading axis: ${seen}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
