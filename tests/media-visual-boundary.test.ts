import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { assertNoNewVisualDebt, type VisualInventory } from "../src/authoring/visual-boundary/inventory.ts";
import { WebCatalogManifest } from "../src/svelte/catalog-manifest.ts";

const viewerPath = "src/svelte/pieces/media/Viewer.svelte";

test("media viewer owns lexical composition without accepting caller rendering or native overrides", async () => {
  assert.equal(WebCatalogManifest.owners.MediaViewer.source, viewerPath);
  assert.equal(WebCatalogManifest.owners.MediaViewer.closure, "private-composition");
  const original = await readFile(new URL(`../${viewerPath}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path: viewerPath, source: original }]));
  for (const path of ["src/svelte/pieces/media/Library.svelte", "src/svelte/pieces/media/PhotoCollection.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  }
  for (const source of [
    '<script>let {children}=$props();</script>{@render children()}',
    '<script>let {attrs}=$props();</script><div {...attrs}/>',
    '<script lang="ts">import type { Snippet } from "svelte"; let {body}:{body:Snippet}=$props();</script>{@render body()}',
    '{@html content}',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path: viewerPath, source }]), /CLOSED_VISUAL_BOUNDARY/);

  const caller = "src/svelte/pieces/MediaCaller.svelte";
  for (const markup of [
    '<Viewer {...props}/>', '<Viewer class="override"/>', '<Viewer style="padding:0"/>',
    '<Viewer data-layout="custom"/>', '<Viewer children={draw}/>', '<Viewer><div>Override</div></Viewer>',
    '<Viewer bind:index/>', '<Viewer bind:open/>',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path: caller,
    source: `<script>import Viewer from "./media/Viewer.svelte";</script>${markup}` }]), /CLOSED_VISUAL_BOUNDARY/);
});

test("new media sources have explicit inventory classification with no finding allowances", async () => {
  const baseline = JSON.parse(await readFile(new URL("../docs/architecture/visual-ownership-debt.json", import.meta.url), "utf8")) as VisualInventory;
  for (const path of [
    "src/svelte/pieces/media/ArtworkPlaceholder.svelte", "src/svelte/pieces/media/playback.svelte.ts",
    "src/svelte/pieces/media/PlaybackCanvas.svelte", "src/svelte/pieces/media/PlaybackControls.svelte",
    "src/svelte/vendor/components/ui/slider/index.ts", "src/svelte/vendor/components/ui/slider/slider.svelte",
    "src/svelte/vendor/components/ui/slider/module.md",
  ]) {
    const recorded = baseline.sources.find(item => item.path === path);
    assert.ok(recorded, `Unclassified media source: ${path}`);
    assert.deepEqual(recorded.findings, []);
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const current = inspectVisualSource(path, source);
    assert.deepEqual(current.findings, []);
    assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [current] }, baseline));
    if (path.endsWith(".svelte") && !path.includes("/vendor/")) {
      assert.throws(() => assertClosedVisualBoundaries([{ path, source: source + '\n{@html foreign}' }]), /CLOSED_VISUAL_BOUNDARY/);
    }
  }
  for (const path of [viewerPath, "src/svelte/explorer/CatalogCard.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertNoNewVisualDebt({ ...baseline, sources: [inspectVisualSource(path, source)] }, baseline));
  }
});
