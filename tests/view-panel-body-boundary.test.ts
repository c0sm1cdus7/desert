import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

test("panel adapters forward only finite projected body data, never rendering or native overrides", async () => {
  for (const path of ["src/svelte/views/Panel.svelte", "src/svelte/InstanceFrame.svelte", "src/svelte/views/ViewItem.svelte"]) {
    const original = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source: original }]));
    for (const suffix of ["<div>Private body</div>", "<style>div{padding:0}</style>",
      '<script>import Private from "./pieces/Drawer.svelte";</script><Private/>']) {
      assert.throws(() => assertClosedVisualBoundaries([{ path, source: suffix }]), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
  const path = "src/svelte/views/Panel.svelte";
  for (const markup of ['<ViewPanel {...props}/>', '<ViewPanel class="override"/>',
    '<ViewPanel children={draw}/>', '<ViewPanel><div>Override</div></ViewPanel>']) {
    const source = '<script>import { ViewPanel } from "../adapter-catalog.ts";</script>' + markup;
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});

test("the shared sequence owner admits only private lexical composition, not caller slots", async () => {
  const path = "src/svelte/pieces/ContentFlow.svelte";
  const original = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source: original }]));
  for (const source of ['<script>let {children}=$props();</script>{@render children()}',
    '<script>let {attrs}=$props();</script><div {...attrs}/>', '{@html content}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});
