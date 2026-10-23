import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { requiredAdapterSources } from "../src/authoring/visual-boundary/adapter.ts";

for (const name of ["Workspace", "ViewProduct"]) test(`${name} selects catalog entries and cannot draw`, async () => {
  const path = `src/svelte/views/${name}.svelte`;
  for (const source of ["<div/>", "<style>div{padding:0}</style>", "<script>document.title='Changed'</script>",
    '<script>import Private from "../pieces/Toolbar.svelte";</script><Private/>',
    '<script>import { ViewWorkspace } from "../adapter-catalog.ts";</script><ViewWorkspace {...props}/>']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
  assert.ok(requiredAdapterSources.includes(path), "real builds cannot omit this adapter");
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
});

test("ViewProduct cannot supply slots or visual overrides to its finite session owner", () => {
  const path = "src/svelte/views/ViewProduct.svelte";
  const script = '<script>import { ViewProductContent } from "../adapter-catalog.ts";</script>';
  for (const markup of ['<ViewProductContent class="p-0"/>', '<ViewProductContent style="padding:0"/>',
    '<ViewProductContent {...native}/>', '<ViewProductContent><div>Unowned</div></ViewProductContent>',
    '<ViewProductContent renderer={custom}/>', '<ViewProductContent bind:this={instance}/>']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source: script + markup }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});
