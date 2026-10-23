import assert from "node:assert/strict";
import test from "node:test";
import { controlNode, applyControlEvent } from "../src/interaction/control-nodes.ts";
import { permitsOptionsSelection } from "../src/interaction/extended-controls.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const descriptor = (retainedDisabled: boolean, multiple = false) => ({
  version: "desert.control/1", kind: "options", id: "delivery", label: "Delivery", disabled: false,
  minSelected: 1, maxSelected: multiple ? 2 : 1, selected: ["retained"], options: [
    { value: "retained", label: "Retained", disabled: retainedDisabled },
    { value: "other", label: "Other", disabled: false },
  ],
});

test("option availability and accepted transition share disabled-retention and cardinality laws", () => {
  for (const retained of [false, true]) for (const multiple of [false, true]) {
    const node = controlNode(descriptor(retained, multiple));
    assert.equal(node.kind, "options");
    if (node.kind !== "options") return;
    for (const selected of [[], ["retained"], ["other"], ["retained", "other"], ["unknown"]]) {
      let accepted = true;
      try { applyControlEvent(node, { kind: "options.change", control: node.id, selected }); }
      catch { accepted = false; }
      assert.equal(permitsOptionsSelection(node, selected), accepted, JSON.stringify({ retained, multiple, selected }));
    }
  }
});

for (const retained of [false, true]) test(`option owner and view remain equal with retained disabled=${retained}`, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import OptionsControl from "@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte";
    import { controlNode, applyControlEvent } from "@desert/interaction/control-nodes.ts";
    let node = $state.raw(controlNode(${JSON.stringify(descriptor(retained))}));
  </script>
  {#if node.kind === 'options'}<OptionsControl {node} onevent={event => node = applyControlEvent(node, event).node} />
    <output>{JSON.stringify(node.selected)}</output>{/if}`);
  try {
    const other = f.page.getByRole("radio", { name: "Other", exact: true });
    assert.equal(await other.isDisabled(), retained);
    if (!retained) await other.click();
    const expected = retained ? "retained" : "other";
    assert.equal(await f.page.locator("output").innerText(), JSON.stringify([expected]));
    assert.equal(await f.page.getByRole("radio", { name: retained ? "Retained" : "Other", exact: true }).isChecked(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("choice primitives cannot display an emitted edit before the owner accepts it", async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import OptionsControl from "@desert/svelte/catalog/compositions/options-control/OptionsControl.svelte";
    import { controlNode } from "@desert/interaction/control-nodes.ts";
    const node = controlNode(${JSON.stringify(descriptor(false))});
    let proposals = $state(0);
  </script>
  {#if node.kind === 'options'}<OptionsControl {node} onevent={() => proposals += 1} />{/if}<output>{proposals}</output>`);
  try {
    await f.page.getByRole("radio", { name: "Other", exact: true }).click();
    assert.equal(await f.page.locator("output").innerText(), "1");
    assert.equal(await f.page.getByRole("radio", { name: "Retained", exact: true }).isChecked(), true);
    assert.equal(await f.page.getByRole("radio", { name: "Other", exact: true }).isChecked(), false);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
