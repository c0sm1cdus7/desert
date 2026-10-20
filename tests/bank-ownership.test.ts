import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const source = (path: string) => readFileSync(new URL(`../src/svelte/${path}`, import.meta.url), "utf8");

test("product, catalog and nested compositions use the one bank dispatch boundary", () => {
  const consumers = ["FrameBody.svelte", "Fields.svelte", "ContextPanel.svelte", "Review.svelte",
    "HumanProduct.svelte", "ProductWorkspace.svelte", "SurfaceHost.svelte",
    "FailureDialog.svelte", "catalog/Specimen.svelte", "catalog/KitchenSink.svelte", "controls/ControlRenderer.svelte"];
  for (const consumer of consumers) {
    const text = source(consumer);
    assert.match(text, /BankRenderer/, `${consumer} bypasses the bank`);
    assert.doesNotMatch(text, /import .+ from ["'][^"']*(?:renderer-registry|pieces\/(?:TextInput|Action|Availability|Drawer|Problem)|\/(?:Fields|Facts|ContextPanel|Review|Collection)\.svelte)/,
      `${consumer} resolves a registered owner independently`);
  }
  const dispatch = source("BankRenderer.svelte");
  assert.match(dispatch, /bankNode\(node\)/);
  assert.match(dispatch, /webRenderers/);
  // Collection is the registered leaf, not a caller that should dispatch to itself.
  assert.match(source("renderer-registry.ts"), /collection: Collection/);
  assert.match(source("Collection.svelte"), /import type \{ BankNodeFor \}/);
  assert.match(source("Collection.svelte"), /<GroupedPanel>/);
});

test("replacing a registered leaf reaches real product frame and catalog specimen together", { timeout: 20000 }, async () => {
  const surface = compile(Notebook).surface("human");
  const page = `<script lang="ts">
    import SurfaceFrame from "@desert/svelte/SurfaceFrame.svelte";
    import Specimen from "@desert/svelte/catalog/Specimen.svelte";
    import { formFrame, toolbarAction } from "@desert/interaction/frame-presenters.ts";
    const surface = ${JSON.stringify(surface)};
    const mutation = surface.journeys.find(journey => journey.id === surface.navigation.primaryAction);
    const frame = formFrame(surface, mutation, {}, {primary:toolbarAction({kind:'journey',journey:mutation.id},'Save','save')});
  </script>
  <section data-product><SurfaceFrame {frame} invoke={() => {}} /></section>
  <section data-catalog><Specimen id="input.text" state="empty" {surface} validateInput={() => true} /></section>`;
  const path = (name: string) => fileURLToPath(new URL(`../src/svelte/${name}`, import.meta.url));
  const replacement = `<script lang="ts">let {label, value = '', onchange = () => {}} = $props();</script>
    <input data-bank-mutant aria-label={label} {value} oninput={event => onchange(event.currentTarget.value)} />`;
  for (const mutated of [false, true]) {
    const registry = source("renderer-registry.ts").replace('"input.text": TextInput,', '"input.text": Availability,');
    const f = await svelteBrowser(page, mutated ? { [path("renderer-registry.ts")]: registry,
      [path("pieces/Availability.svelte")]: replacement } : {});
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
