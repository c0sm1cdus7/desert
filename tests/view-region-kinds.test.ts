// ViewRegion (slice 3, F1.9, DESIGN §1.1): the document and retained kinds, label, visible and active, and the reveal it
// registers in the region registry (DESIGN §5). Retained absorbs the retained-place composition's behaviour.
import test from "node:test";
import assert from "node:assert/strict";
import { renderFoundation } from "./fixtures/foundation-server.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const region = "@desert/svelte/catalog/foundations/view-region/ViewRegion.svelte";
const markup = async (body: string) => (await renderFoundation(`<script lang="ts">\n  import ViewRegion from "${region}";\n</script>\n${body}`))
  .replace(/<!--[^>]*-->/g, "");

test("a document is the place content article, named by its label", async () => {
  const body = await markup(`<ViewRegion kind="document" id="travel-kit" label="Travel kit"><p>Budget</p></ViewRegion>`);
  assert.match(body, /<article class="place-content" data-place-content="" aria-label="Travel kit"><p>Budget<\/p>/);
});

test("a retained region stays mounted while hidden", async () => {
  const body = await markup(`<ViewRegion kind="retained" id="notes" visible={false} active={false}><p>Draft</p></ViewRegion>`);
  assert.match(body, /<div data-retained-place="" hidden=""><p>Draft<\/p><\/div>/);
  assert.match(await markup(`<ViewRegion kind="retained" id="notes" active><p>Draft</p></ViewRegion>`), /<div data-retained-place=""><p>Draft/);
});

test("bare renders its content unframed unless visibility is given; an item with a label is a named section", async () => {
  assert.match(await markup(`<ViewRegion kind="bare" id="home"><p>Home</p></ViewRegion>`), /^<p>Home<\/p>$/);
  assert.match(await markup(`<ViewRegion kind="bare" id="home" visible={false}><p>Home</p></ViewRegion>`), /<div hidden=""><p>Home<\/p><\/div>/);
  assert.match(await markup(`<ViewRegion kind="item" id="entry:action" label="action" visible={false}><p>A</p></ViewRegion>`),
    /<section data-view-item="entry:action" aria-label="action" hidden=""><p>A<\/p><\/section>/);
  assert.match(await markup(`<ViewRegion kind="item" id="notes.details"><p>A</p></ViewRegion>`), /<div data-view-item="notes.details"><p>A<\/p><\/div>/);
  assert.match(await markup(`<ViewRegion kind="view" id="notes" layout="overview" inset><p>A</p></ViewRegion>`),
    /<div data-content-layout="overview" data-view-content="notes" class="place-content"><p>A<\/p><\/div>/);
});

const host = `<script lang="ts">
  import ViewRegion from "${region}";
  import { provideRegionRegistry } from "@desert/svelte/infra/region-registry.ts";
  import Probe from "./tests/fixtures/activity-probe.svelte";
  const registry = provideRegionRegistry();
  Reflect.set(window, "registry", registry);
  let active = $state(true);
  Reflect.set(window, "deactivate", () => { active = false; });
</script>
<div data-catalog-scroll style="height:200px;overflow-y:auto">
  <div style="height:900px"></div>
  <ViewRegion kind="item" id="notes.details"><h2>Details</h2><p>Body</p></ViewRegion>
  <ViewRegion kind="retained" id="notes" {active}><Probe /></ViewRegion>
</div>`;

test("a region registers its reveal under its id: it scrolls its viewport and focuses its heading", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(host);
  try {
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "registry").reveal("missing", true)), false);
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "registry").reveal("notes.details", true)), true);
    const state = await f.page.evaluate(() => ({ scroll: document.querySelector("[data-catalog-scroll]")?.scrollTop ?? 0,
      focused: document.activeElement?.textContent }));
    assert.ok(state.scroll > 600, `scrolled to the region (${state.scroll})`);
    assert.equal(state.focused, "Details");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a retained region provides its activity: content dismisses itself when the region becomes inactive", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(host);
  try {
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "dismissed")), undefined);
    await f.page.evaluate(() => Reflect.get(window, "deactivate")());
    await f.page.waitForFunction(() => Reflect.get(window, "dismissed") === true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
