import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

test("navigation and View workspace own composition without accepting caller rendering", async () => {
  for (const path of ["src/svelte/catalog/compositions/catalog-navigation/CatalogNavigation.svelte", "src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte",
    "src/svelte/catalog/compositions/local-exercise-content/LocalExerciseContent.svelte",
    "src/svelte/catalog/compositions/public-catalog-product-content/PublicCatalogProductContent.svelte", "src/svelte/catalog/compositions/view-product-content/ViewProductContent.svelte",
    "src/svelte/catalog/compositions/fact-group/FactGroup.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
    for (const replacement of [
      '<script>let {children}=$props()</script>{@render children()}',
      '<script lang="ts">import type {Snippet} from "svelte";let {body}:{body:Snippet}=$props()</script>{@render body()}',
      '<script>let {attrs}=$props()</script><div {...attrs}/>',
      '{@html foreign}',
    ]) assert.throws(() => assertClosedVisualBoundaries([{ path, source: replacement }]), /CLOSED_VISUAL_BOUNDARY/);
    for (const markup of ['<Owner class="custom"/>', '<Owner style="padding:0"/>', '<Owner {...props}/>',
      '<Owner children={foreign}/>', '<Owner><div>Foreign</div></Owner>']) {
      assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/Consumer.svelte",
        source: `<script>import Owner from "./${path.slice("src/svelte/".length)}";</script>${markup}` }]), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
});

test("renderers only select their finite catalog owners", async () => {
  for (const path of ["src/svelte/catalog/renderer/view-product/ViewProduct.svelte", "src/svelte/catalog/renderer/workspace/Workspace.svelte",
    "src/svelte/catalog/renderer/panel/Panel.svelte", "src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte",
    "src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte", "src/svelte/catalog/renderer/facts/Facts.svelte"]) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.deepEqual(inspectVisualSource(path, source).findings, []);
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  for (const addition of ['<div/>', '<button>Foreign</button>', '<style>p{padding:0}</style>', '{@html foreign}']) {
    assert.throws(() => assertClosedVisualBoundaries([{ path, source: source + addition }]), /CLOSED_VISUAL_BOUNDARY/);
  }
  }
});
