// The Labels field reads on one axis (second review of the slice 3 package): its group heading «Labels» started 16px to
// the right of its tags and of «Add label», which stand on the group's edge. A group whose content is unframed controls
// (chips, an action) puts its heading on that edge; a group over rows, fields or lists keeps it on the row inset, where
// their text reads.
import test from "node:test";
import assert from "node:assert/strict";
import { mounted } from "./support/foundation.ts";

test("labels field: the heading, the tags and «Add label» start on one axis", async () => {
  const f = await mounted(`<div style="width:354px" data-probe>
    <LabelsControl node={{ version: "desert.control/1", kind: "labels", id: "labels", label: "Labels", disabled: false,
      values: ["Design", "Research"], limits: { maxItems: 12, maxLength: 64 } }} onevent={() => {}} />
  </div>
  <div style="width:354px" data-row>
    <Catalog.StackLayout title="Contract"><Catalog.Information items={[{ kind: "fact", label: "Owner", value: "LabelsControl" }]} /></Catalog.StackLayout>
  </div>`, `  import LabelsControl from "@desert/svelte/catalog/compositions/labels-control/LabelsControl.svelte";`);
  try {
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 800 });
      const left = await f.page.evaluate(() => {
        const text = (scope: Element, words: string) => { const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent?.trim() === words) {
            const range = document.createRange(); range.selectNodeContents(node); return Math.round(range.getBoundingClientRect().left); }
          return NaN; };
        const probe = document.querySelector("[data-probe]")!, row = document.querySelector("[data-row]")!;
        const edge = (selector: string) => Math.round(probe.querySelector(selector)!.getBoundingClientRect().left);
        return { probe: Math.round(probe.getBoundingClientRect().left), heading: text(probe, "Labels"), tag: edge('[data-slot="badge"]'),
          add: edge('button[aria-label="Add label"]'), rowHeading: text(row, "Contract") - Math.round(row.getBoundingClientRect().left),
          rowText: text(row, "Owner") - Math.round(row.getBoundingClientRect().left) };
      });
      assert.equal(left.tag, left.probe, `${width}: the tags stand on the group's edge`);
      assert.equal(left.add, left.probe, `${width}: «Add label» stands on the group's edge`);
      assert.equal(left.heading, left.probe, `${width}: the heading «Labels» starts where its tags and action start: ${JSON.stringify(left)}`);
      // (the row's text sits inside the list's 1px border)
      assert.ok(Math.abs(left.rowHeading - left.rowText) <= 1, `${width}: a heading over rows keeps their text's row inset: ${JSON.stringify(left)}`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
