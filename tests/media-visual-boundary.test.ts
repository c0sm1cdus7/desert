import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative } from "node:path";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";
import { WebCatalogManifest } from "../src/svelte/catalog-manifest.ts";

const viewerPath = "src/svelte/catalog/compositions/viewer/Viewer.svelte";

test("media viewer owns lexical composition without accepting caller rendering or native overrides", async () => {
  assert.equal(WebCatalogManifest.owners.MediaViewer.source, viewerPath);
  assert.equal(WebCatalogManifest.owners.MediaViewer.closure, "private-composition");
  const original = await readFile(new URL(`../${viewerPath}`, import.meta.url), "utf8");
  assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path: viewerPath, source: original }]));
  for (const path of ["src/svelte/catalog/compositions/library/Library.svelte", "src/svelte/catalog/compositions/photo-collection/PhotoCollection.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotThrow(() => assertClosedVisualBoundaries([{ path, source }]));
  }
  for (const source of [
    '<script>let {children}=$props();</script>{@render children()}',
    '<script>let {attrs}=$props();</script><div {...attrs}/>',
    '<script lang="ts">import type { Snippet } from "svelte"; let {body}:{body:Snippet}=$props();</script>{@render body()}',
    '{@html content}',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path: viewerPath, source }]), /CLOSED_VISUAL_BOUNDARY/);

  const caller = "src/svelte/catalog/compositions/media-caller/MediaCaller.svelte";
  const viewerSpecifier = relative(dirname(caller), viewerPath);
  for (const markup of [
    '<Viewer {...props}/>', '<Viewer class="override"/>', '<Viewer style="padding:0"/>',
    '<Viewer data-layout="custom"/>', '<Viewer children={draw}/>', '<Viewer><div>Override</div></Viewer>',
    '<Viewer bind:index/>', '<Viewer bind:open/>',
  ]) assert.throws(() => assertClosedVisualBoundaries([{ path: caller,
    source: `<script>import Viewer from "${viewerSpecifier}";</script>${markup}` }]), /CLOSED_VISUAL_BOUNDARY/);
});

// Restored from the debt-baseline test retired in slice 0 (§5.3): media sources inspect clean and cannot render raw HTML.
// infra/playback.svelte.ts touches the media element: catalog rule I (slice 1) refuses it until its owner is decided.
test("media playback sources inspect clean and refuse raw HTML", async () => {
  for (const path of ["src/svelte/catalog/foundations/artwork-placeholder/ArtworkPlaceholder.svelte",
    "src/svelte/catalog/foundations/playback-canvas/PlaybackCanvas.svelte", "src/svelte/catalog/compositions/playback-controls/PlaybackControls.svelte",
    "src/svelte/vendor/components/ui/slider/index.ts", "src/svelte/vendor/components/ui/slider/slider.svelte"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.deepEqual(inspectVisualSource(path, source).findings, [], path);
    if (path.endsWith(".svelte") && !path.includes("/vendor/")) {
      assert.throws(() => assertClosedVisualBoundaries([{ path, source: `${source}\n{@html foreign}` }]), /CLOSED_VISUAL_BOUNDARY/, path);
    }
  }
});
