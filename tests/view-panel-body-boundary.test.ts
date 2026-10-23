import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative } from "node:path";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const from = (path: string, target: string) => relative(dirname(path), target);

test("panel adapters forward only finite projected body data, never rendering or native overrides", async () => {
  for (const path of ["src/svelte/catalog/renderer/panel/Panel.svelte", "src/svelte/catalog/renderer/instance-frame/InstanceFrame.svelte", "src/svelte/catalog/renderer/view-item/ViewItem.svelte"]) {
    const original = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source: original }]));
    for (const suffix of ["<div>Private body</div>", "<style>div{padding:0}</style>",
      `<script>import Private from "${from(path, "src/svelte/catalog/foundations/drawer/Drawer.svelte")}";</script><Private/>`]) {
      assert.throws(() => assertClosedVisualBoundaries([{ path, source: suffix }]), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
  const path = "src/svelte/catalog/renderer/panel/Panel.svelte";
  for (const markup of ['<ViewPanel {...props}/>', '<ViewPanel class="override"/>',
    '<ViewPanel children={draw}/>', '<ViewPanel><div>Override</div></ViewPanel>']) {
    const source = `<script>import { ViewPanel } from "${from(path, "src/svelte/adapter-catalog.ts")}";</script>` + markup;
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});

test("the shared sequence owner admits only private lexical composition, not caller slots", async () => {
  const path = "src/svelte/catalog/compositions/content-flow/ContentFlow.svelte";
  const original = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source: original }]));
  for (const source of ['<script>let {children}=$props();</script>{@render children()}',
    '<script>let {attrs}=$props();</script><div {...attrs}/>', '{@html content}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});
