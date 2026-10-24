import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { CreateNote } from "../products/notebook/journeys.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { notebookScope } from "./fixtures/notebook-scope.ts";
import type { HumanSurface } from "../src/web/types.ts";

const source = (path: string) => readFileSync(new URL(`../src/svelte/${path}`, import.meta.url), "utf8");

test("product, catalog and nested compositions use the one bank dispatch boundary", () => {
  const consumers = ["catalog/renderer/frame-body/FrameBody.svelte", "catalog/compositions/fields/Fields.svelte", "catalog/compositions/context-panel/ContextPanel.svelte", "catalog/compositions/review/Review.svelte",
    "catalog/renderer/failure-dialog/FailureDialog.svelte", "catalog/compositions/specimen/Specimen.svelte", "catalog/compositions/inspection/Inspection.svelte", "catalog/compositions/fact-group/FactGroup.svelte", "catalog/renderer/control-renderer/ControlRenderer.svelte"];
  for (const consumer of consumers) {
    const text = source(consumer);
    assert.match(text, /NodeRenderer/, `${consumer} bypasses the bank`);
    assert.doesNotMatch(text, /import .+ from ["'][^"']*(?:renderer-registry|\/(?:TextInput|Action|Availability|Drawer|Problem)|\/(?:Fields|Facts|ContextPanel|Review|Collection)\.svelte)/,
      `${consumer} resolves a registered owner independently`);
  }
  const dispatch = source("catalog/renderer/node-renderer/NodeRenderer.svelte");
  assert.match(dispatch, /resolvedNode\(node\)/);
  assert.match(dispatch, /nodeRenderers/);
  // Collection is the registered leaf, not a caller that should dispatch to itself.
  assert.match(source("renderer-registry.ts"), /collection: Collection/);
  assert.match(source("catalog/compositions/collection/Collection.svelte"), /: CatalogProps<"collection"> = \$props\(\)/);
  assert.match(source("catalog/compositions/collection/Collection.svelte"), /<GroupedPanel>/);
  assert.match(source("catalog/renderer/inspection-content/InspectionContent.svelte"), /import \{ Inspection \} from "\.\.\/\.\.\/index\.ts"/);
  assert.match(source("catalog/index.ts"), /export \{ default as Inspection \} from "\.\/compositions\/inspection\/Inspection\.svelte";/);
});

test("replacing a registered leaf reaches real product frame and catalog specimen together", { timeout: 20000 }, async () => {
  const surface = compile(Notebook).surface("human") as HumanSurface;
  const page = `<script lang="ts">
    import SurfaceFrame from "@desert/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte";
    import Specimen from "@desert/svelte/catalog/compositions/specimen/Specimen.svelte";
    import { formFrame, toolbarAction } from "@desert/interaction/frame-presenters.ts";
    const surface = ${JSON.stringify(surface)};
    const scope = ${JSON.stringify(notebookScope(surface))};
    const mutation = surface.journeys.find(journey => journey.id === ${JSON.stringify(CreateNote.id)});
    const frame = formFrame(surface, mutation, {}, {primary:toolbarAction({kind:'journey',journey:mutation.id},'Save','save')});
  </script>
  <section data-product><SurfaceFrame {frame} invoke={() => {}} /></section>
  <section data-catalog><Specimen id="input.text" state="empty" {surface} {scope} validateInput={() => true} /></section>`;
  const path = (name: string) => fileURLToPath(new URL(`../src/svelte/${name}`, import.meta.url));
  const replacement = `<script lang="ts">let {label, value = '', onchange = () => {}} = $props();</script>
    <input data-bank-mutant aria-label={label} {value} oninput={event => onchange(event.currentTarget.value)} />`;
  for (const mutated of [false, true]) {
    const registry = source("renderer-registry.ts").replace('"input.text": TextInput,', '"input.text": Availability,');
    const f = await svelteBrowser(page, mutated ? { [path("renderer-registry.ts")]: registry,
      [path("catalog/foundations/availability/Availability.svelte")]: replacement } : {});
    try {
      for (const owner of ["product", "catalog"]) {
        assert.equal(await f.page.locator(`[data-${owner}] [data-bank-mutant]`).count(), mutated ? 1 : 0,
          `${owner} did not consume the registered replacement`);
        assert.equal(await f.page.locator(`[data-${owner}] input`).count(), 1);
      }
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
});
