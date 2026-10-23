import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative } from "node:path";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { requiredAdapterSources } from "../src/authoring/visual-boundary/adapter.ts";

const adapters = { Workspace: "src/svelte/catalog/renderer/workspace/Workspace.svelte",
  ViewProduct: "src/svelte/catalog/renderer/view-product/ViewProduct.svelte" };
const from = (path: string, target: string) => relative(dirname(path), target);
const adapterCatalog = "src/svelte/adapter-catalog.ts";

for (const [name, path] of Object.entries(adapters)) test(`${name} selects catalog entries and cannot draw`, async () => {
  for (const source of ["<div/>", "<style>div{padding:0}</style>", "<script>document.title='Changed'</script>",
    `<script>import Private from "${from(path, "src/svelte/catalog/compositions/toolbar/Toolbar.svelte")}";</script><Private/>`,
    `<script>import { ViewWorkspace } from "${from(path, adapterCatalog)}";</script><ViewWorkspace {...props}/>`]) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source }]), /CLOSED_VISUAL_BOUNDARY/);
  }
  assert.ok(requiredAdapterSources.includes(path), "real builds cannot omit this adapter");
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
});

test("ViewProduct cannot supply slots or visual overrides to its finite session owner", () => {
  const path = adapters.ViewProduct;
  const script = `<script>import { ViewProductContent } from "${from(path, adapterCatalog)}";</script>`;
  for (const markup of ['<ViewProductContent class="p-0"/>', '<ViewProductContent style="padding:0"/>',
    '<ViewProductContent {...native}/>', '<ViewProductContent><div>Unowned</div></ViewProductContent>',
    '<ViewProductContent renderer={custom}/>', '<ViewProductContent bind:this={instance}/>']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source: script + markup }]), /CLOSED_VISUAL_BOUNDARY/);
  }
});
