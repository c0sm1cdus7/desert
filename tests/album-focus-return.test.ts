// Lane B integration: the catalog card is a Card answering to `catalog-return:<record>` and draws no record mark, so the
// view workspace's album Back returns focus to the album's card through the focus scope, not a DOM lookup.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { program } from "./fixtures/view-program.ts";

test("view workspace: closing an album returns focus to the album card that opened it", async () => {
  const library = { kind: "media-library", id: "library", library: { id: "photos",
    items: [{ id: "coast", kind: "image", title: "Coast", image: { asset: "coast", alt: "A coast" } }],
    albums: [{ id: "trip", title: "Trip", cover: "coast", items: ["coast"] }], featured: ["trip"] } };
  const views = program.views.map(view => view.id === "catalog" ? { ...view, content: [library] } : view);
  const f = await svelteBrowser(`<script>
  import Workspace from './src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte';
  const program = ${JSON.stringify({ ...program, views })};
  const resolved = {view:program.views.find(view=>view.id==='catalog'),bindings:{},disabledOutputs:[]};
</script>
<Workspace {program} {resolved} activeDestination="catalog" error={null} uncertain={false} onevent={()=>{}} onnavigate={()=>{}} />`);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: "Trip", exact: true }).click();
    await f.page.getByRole("button", { name: "Back", exact: true }).first().click();
    await f.page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Trip", null, { timeout: 5000 });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
