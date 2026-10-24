// Slice 3 (F1.8): Image absorbs ArtworkPlaceholder (`placeholder` video, audio or unavailable) and owns its geometry,
// which leaves media.css; its retry is an Action. Pixels are those of 53f9c47: the placeholder draws exactly what
// ArtworkPlaceholder drew, alone and inside the catalog card and the viewer's playback canvas, and an image draws exactly
// what the frozen Image drew over the frozen media.css.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import type { Page } from "playwright";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";
import { inlineImports, measureProbes, renderCases, type Probes } from "./fixtures/parity.ts";
import { contentBefore } from "./fixtures/content-before.ts";
import { marksBefore } from "./fixtures/marks-before.ts";

const root = resolve(import.meta.dirname, "..");
const frozenFiles = ["src/svelte/catalog/foundations/image/Image.svelte", "src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte",
  "src/svelte/catalog/foundations/playback-canvas/PlaybackCanvas.svelte"];
const frozen = Object.fromEntries(frozenFiles.map(path => [resolve(root, path), contentBefore[path] ?? ""]));
const frozenCss = () => rendererCss([], inlineImports(marksBefore["src/svelte/theme.css"] ?? "",
  { "src/svelte/catalog/mechanisms/media/media.css": contentBefore["src/svelte/catalog/mechanisms/media/media.css"] ?? "" }));

const photo = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23468'/%3E%3C/svg%3E";
const cases = (placeholder: (kind: string) => string) => `<script lang="ts">
  import Image from "@desert/svelte/catalog/foundations/image/Image.svelte";
  import ArtworkPlaceholder from "@desert/svelte/catalog/foundations/artwork-placeholder/ArtworkPlaceholder.svelte";
  import CatalogCard from "@desert/svelte/catalog/foundations/catalog-card/CatalogCard.svelte";
  import PlaybackCanvas from "@desert/svelte/catalog/foundations/playback-canvas/PlaybackCanvas.svelte";
  import { mediaPlayback } from "@desert/svelte/infra/playback.svelte.ts";
  const photo = "${photo}";
  const playback = mediaPlayback();
  const card = (record, extra) => ({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record, title: "Night ferry", ...extra });
</script>
<main style="display:grid;gap:16px;padding:16px;--catalog-media-height:180px">
  <div data-case="ready-fill" style="width:320px;height:200px"><Image source={photo} alt="Lake" /></div>
  <div data-case="ready-fit" style="width:320px;height:120px"><Image source={photo} alt="Lake" fit="fit" /></div>
  <div data-case="error" style="width:320px;height:200px"><Image source="/media/missing-photo.jpg" alt="Missing photo" retry /></div>
  <div data-case="audio" style="width:320px;height:200px">${placeholder("audio")}</div>
  <div data-case="video" style="width:320px;height:200px">${placeholder("video")}</div>
  <div data-case="card-placeholder"><CatalogCard node={card("night-ferry", { mediaType: "video" })} /></div>
  <div data-case="canvas-audio" data-media-stage style="position:relative;width:320px;height:200px">
    <PlaybackCanvas item={{ kind: "audio", source: "/media/interview.m4a", alt: "Interview", captions: [] }} {playback} />
  </div>
</main>`;

const image = { root: "[data-media-image]", img: "img" };
const placeholder = { root: "[data-media-artwork-placeholder]", glyph: "svg" };
const probes: Probes = {
  "ready-fill": image, "ready-fit": image,
  error: { root: "[data-media-image]", error: "[data-media-error]", message: "[data-media-error] > span" },
  audio: placeholder, video: placeholder, "card-placeholder": { card: "[data-catalog-card]", ...placeholder },
  "canvas-audio": placeholder,
};

async function settled(page: Page) {
  for (const name of ["ready-fill", "ready-fit"]) await page.locator(`[data-case="${name}"] [data-image-state="ready"]`).waitFor();
  await page.locator('[data-case="error"] [data-image-state="error"]').waitFor();
}

test("image: its folder imports no foreign vendor, styles only its own classes and covers every state and fit", async () => {
  const found = await treeViolations(["src/svelte/catalog/foundations/image/"], ["E", "F", "G", "H", "I", "J"]);
  // F1-merge: the retry mounts today's Action, whose contract is still a stub; the escape clears when F1b closes it.
  assert.deepEqual(found.filter(line => !line.startsWith("PRESENTATION_ESCAPE: src/svelte/catalog/foundations/image/Image.svelte") || !line.includes("<Action>")), []);
});

test("image: the placeholder and the image keep the pixels of ArtworkPlaceholder and Image at 53f9c47", { timeout: 60000 }, async () => {
  const before = await renderCases(cases(kind => `<ArtworkPlaceholder kind="${kind}" />`), frozen, await frozenCss());
  const after = await renderCases(cases(kind => `<Image placeholder="${kind}" />`), {}, await rendererCss());
  try {
    await Promise.all([settled(before.page), settled(after.page)]);
    const [was, is] = [await measureProbes(before.page, probes), await measureProbes(after.page, probes)];
    for (const name of Object.keys(probes)) assert.deepEqual(is[name], was[name], name);
    // The retry keeps its box; its own styling is Action's (the vendor button's secondary face before).
    const retry: Probes = { error: { retry: "button" } };
    assert.deepEqual(await measureProbes(after.page, retry, []), await measureProbes(before.page, retry, []));
    assert.equal(await after.page.locator('[data-case="audio"] [data-media-artwork-placeholder]').getAttribute("aria-label"), "No cover artwork");
    assert.equal(await after.page.locator('[data-case="error"] button').getAttribute("data-primitive"), "action", "the retry is an Action");
    assert.deepEqual([before.errors, after.errors], [[], []]);
  } finally { await before.close(); await after.close(); }
});

test("image: an unavailable placeholder says its fallback in the muted frame", async () => {
  const f = await renderCases(`<script lang="ts">import Image from "@desert/svelte/catalog/foundations/image/Image.svelte";</script>
    <div data-case="unavailable" style="width:200px;height:100px"><Image placeholder="unavailable" fallback="Media unavailable" /></div>`, {}, await rendererCss());
  try {
    const frame = f.page.locator('[data-image-placeholder="unavailable"]');
    assert.equal(await frame.textContent(), "Media unavailable");
    assert.deepEqual(await frame.evaluate(element => { const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return [style.display, style.placeItems, box.width, box.height]; }), ["grid", "center", 200, 100]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
