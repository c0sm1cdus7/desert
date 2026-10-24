// Slice 3 (F1.8): the media foundations keep the pixels of what they absorb, rendered live beside them: MediaViewer the
// viewer (its stage, paging, thumbnails and media controls band), MediaPlayer the media object's player and controls,
// Gallery the photo collection in each host, ThemePreview the appearance preview (but for the "Aa" glyph, design §7.3).
import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright";
import { resolve } from "node:path";
import { appearancePreviewBefore } from "./fixtures/appearance-before.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { measureProbes, renderCases, settle, type Probes } from "./fixtures/parity.ts";

const photo = (fill: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23${fill}'/%3E%3C/svg%3E`;
const images = `[{ kind: "image", source: "${photo("468")}", alt: "Lake" }, { kind: "image", source: "${photo("864")}", alt: "Dunes" }]`;
const playables = `[{ kind: "video", source: "/media/film.webm", alt: "Motion study", captions: [{ source: "/media/captions.vtt", language: "en", label: "English" }] },
  { kind: "audio", source: "/media/silence.wav", alt: "Silence", captions: [] }]`;
const boxes = (page: Page, probes: Probes) => measureProbes(page, probes, []);
/** Open (F1b): Action's icon face sizes to its hidden label, because the button's w-fit overrides the icon-lg size-11; the
 * vendor icon buttons it replaces were 44px square, as design §7.1 keeps them. The foundations' pages take that width
 * until Action draws it, so the rest of each layout is compared exactly. */
const squareIcons = (page: Page) => page.addStyleTag({ content: '[data-action][data-action-face="icon"] { width:2.75rem; }' });
/** The viewer portals into the body: the body is the case. */
const asCase = (page: Page) => page.evaluate(() => document.body.setAttribute("data-case", "viewer"));

const viewer = (items: string, foundation: boolean) => `<script lang="ts">
  import Viewer from "@desert/svelte/catalog/compositions/viewer/Viewer.svelte";
  import MediaViewer from "@desert/svelte/catalog/foundations/media-viewer/MediaViewer.svelte";
  const items = ${items};
</script>
${foundation ? `<MediaViewer {items} title="Studio" index={0} open />` : `<Viewer {items} title="Studio" index={0} open onreturn={() => {}} />`}`;
const viewerProbes = (foundation: boolean, playable: boolean): Probes => ({ viewer: {
  dialog: "[data-media-viewer]", top: '[data-media-viewer] > [data-toolbar="top"]',
  ...playable ? {} : { stage: "[data-media-stage]", image: "[data-media-stage] [data-media-image]" },
  thumbs: "[data-media-thumbs]", thumb: "[data-media-thumbs] button", band: foundation ? (playable ? "[data-media-band]" : ".viewer-band") : '[data-toolbar="bottom"]',
  ...playable ? { video: "video", seek: '[role="slider"][aria-label="Playback position"]', volume: '[role="slider"][aria-label="Volume"]' } : {},
} });
const viewerButtons: Probes = { viewer: { previous: 'button[aria-label="Previous media"]', next: 'button[aria-label="Next media"]',
  close: 'button[aria-label="Close media viewer"]' } };
const playerButtons: Probes = { viewer: { play: 'button[aria-label="Play"]', mute: 'button[aria-label="Mute"]', captions: 'button[aria-label="Captions"]' } };

for (const width of [1000, 390]) for (const playable of [false, true]) test(`media-viewer keeps the viewer's pixels for ${playable ? "video and audio" : "images"} at ${width}px`, { timeout: 60000 }, async () => {
  const css = await rendererCss(), viewport = { width, height: 844 };
  const [was, is] = [await renderCases(viewer(playable ? playables : images, false), {}, css, viewport),
    await renderCases(viewer(playable ? playables : images, true), {}, css, viewport)];
  try {
    await squareIcons(is.page);
    for (const f of [was, is]) {
      await asCase(f.page);
      await f.page.locator(playable ? "[data-media-viewer] video" : '[data-media-stage] [data-image-state="ready"]').waitFor({ state: "attached" });
      if (playable) await f.page.getByText("Media unavailable", { exact: true }).waitFor();
      await settle(f.page);
    }
    const styled = (foundation: boolean) => viewerProbes(foundation, playable);
    const [old, now] = [await measureProbes(was.page, styled(false)), await measureProbes(is.page, styled(true))];
    for (const probe of Object.keys(old.viewer ?? {})) {
      // The band was a toolbar: its box and the boxes inside it are compared; its frame styles were the toolbar's.
      const box = ["band", "seek", "volume"].includes(probe);
      const pick = (value: typeof old) => value.viewer?.[probe]?.map(item => box ? item.box : item);
      assert.deepEqual(pick(now), pick(old), probe);
    }
    assert.deepEqual(await boxes(is.page, viewerButtons), await boxes(was.page, viewerButtons), "paging and close keep their boxes");
    if (playable) assert.deepEqual(await boxes(is.page, playerButtons), await boxes(was.page, playerButtons), "transport, mute and captions keep their boxes");
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});

const hosts = (foundation: boolean) => `<script lang="ts">
  import MediaObject from "@desert/svelte/catalog/compositions/media-object/MediaObject.svelte";
  import MediaControl from "@desert/svelte/catalog/compositions/media-control/MediaControl.svelte";
  import CatalogDetail from "@desert/svelte/catalog/compositions/catalog-detail/CatalogDetail.svelte";
  import Gallery from "@desert/svelte/catalog/foundations/gallery/Gallery.svelte";
  import MediaPlayer from "@desert/svelte/catalog/foundations/media-player/MediaPlayer.svelte";
  import PlaceHeading from "@desert/svelte/catalog/compositions/place-heading/PlaceHeading.svelte";
  import Heading from "@desert/svelte/catalog/foundations/heading/Heading.svelte";
</script>
<main data-renderer-profile="apple-reference" style="display:grid;gap:24px;width:640px;padding:16px">
${foundation ? `
  <div data-case="object-image"><figure style="margin:0;display:grid;gap:16px"><Gallery photos={[{ source: "/media/lake.jpg", alt: "Lake" }]} title="Image" presentation="inline" fit="fit" aspect="fill" /></figure></div>
  <div data-case="object-video"><figure style="margin:0;display:grid;gap:16px"><MediaPlayer item={{ kind: "video", source: { kind: "asset", reference: "10000000-0000-4000-8000-000000000003", media: "video" }, alt: "Image", captions: [] }} presentation="inline" /></figure></div>
  <div data-case="control-image" style="display:flex;flex-direction:column;gap:8px"><Gallery photos={[{ source: "/media/lake.jpg", alt: "Lake" }]} title="Cover" presentation="inline" fit="fill" aspect="landscape" /></div>
  <div data-case="detail"><Gallery photos={[{ source: "/media/lake.jpg", alt: "Lake" }, { source: "/media/lake.jpg", alt: "Lake again" }]} title="Lake" presentation="detail" fit="fill" aspect="fill" /></div>
  <!-- The place heading as PlaceHeading draws it, holding the gallery in its header presentation (F1f mounts it so). -->
  <div data-case="header"><div class="place-heading-content" data-place-header data-featured-media="gallery" data-media-unavailable={false}>
    <Gallery photos={[{ source: "/media/lake", alt: "Lake" }, { source: "/media/dunes", alt: "Dunes" }]} title="Trip" presentation="header" fit="fill" aspect="fill" />
    <div class="place-heading-copy" data-dock-above><Heading kind="page" text="Trip" focusTarget /><p class="type-support" data-place-subtitle>Two days</p></div>
  </div></div>`
  : `
  <div data-case="object-image"><MediaObject facts={{ media: "/media/lake.jpg" }} presentation={{ kind: "media-object", media: "media" }} /></div>
  <div data-case="object-video"><MediaObject facts={{ media: { kind: "asset", reference: "10000000-0000-4000-8000-000000000003", media: "video" } }} presentation={{ kind: "media-object", media: "media" }} /></div>
  <div data-case="control-image"><MediaControl node={{ kind: "image", label: "Cover", alt: "Lake", aspect: "landscape", source: "/media/lake.jpg" }} /></div>
  <div data-case="detail"><CatalogDetail node={{ version: "desert.bank-node/1", kind: "catalog.detail", record: "lake", title: "Lake", description: "A lake.",
    image: { asset: "lake", alt: "Lake" }, gallery: [{ asset: "lake", alt: "Lake" }, { asset: "lake", alt: "Lake again" }] }} /></div>
  <div data-case="header"><PlaceHeading identity={{ title: "Trip", subtitle: "Two days", media: { kind: "gallery", images: [{ asset: "lake", alt: "Lake" }, { asset: "dunes", alt: "Dunes" }] } }} /></div>`}
</main>`;
const galleryProbes: Probes = {
  "object-image": { gallery: "[data-photo-collection]", image: "[data-media-image]", open: "[data-media-open]" },
  "control-image": { gallery: "[data-photo-collection]", image: "[data-media-image]", open: "[data-media-open]" },
  detail: { gallery: "[data-photo-collection]", open: "[data-media-open]", dots: "[data-media-dots]", dot: "[data-media-dots] button" },
  header: { heading: "[data-place-header]", gallery: "[data-photo-collection]", open: "[data-media-open]", dots: "[data-media-dots]",
    dot: "[data-media-dots] button", copy: ".place-heading-copy" },
};
const playerBoxes: Probes = { "object-video": { video: "video", play: 'button[aria-label="Play"]', mute: 'button[aria-label="Mute"]',
  seek: '[role="slider"][aria-label="Playback position"]', volume: '[role="slider"][aria-label="Volume"]' } };

test("gallery and media-player keep the photo collection's and the media object's pixels in their hosts", { timeout: 60000 }, async () => {
  const css = await rendererCss();
  const [was, is] = [await renderCases(hosts(false), {}, css), await renderCases(hosts(true), {}, css)];
  try {
    await squareIcons(is.page);
    for (const f of [was, is]) {
      await f.page.locator('[data-case="object-video"] video').waitFor({ state: "attached" });
      for (const name of ["object-image", "control-image", "detail", "header"]) await f.page.locator(`[data-case="${name}"] [data-image-state="error"]`).waitFor();
      await settle(f.page);
    }
    // The photo frame is the gallery's own (its box and paint); the image and opener inside it are compared whole.
    // The photo frame is the gallery's own: it clips at its own radius where a host's wrapper clipped it, so its box is
    // compared; the image, the opener and the dots inside it are compared whole.
    const frames = (value: Awaited<ReturnType<typeof measureProbes>>) => Object.fromEntries(Object.entries(value).map(([name, probes]) =>
      [name, { ...probes, gallery: probes.gallery?.map(item => item.box) }]));
    const [old, now] = [await measureProbes(was.page, galleryProbes), await measureProbes(is.page, galleryProbes)];
    assert.deepEqual(frames(now), frames(old));
    assert.deepEqual(await boxes(is.page, playerBoxes), await boxes(was.page, playerBoxes));
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});

test("theme-preview keeps the appearance preview's pixels, its glyph aside (the page role, design §7.3)", async () => {
  const preview = (foundation: boolean) => `<script lang="ts">
    import AppearancePreview from "@desert/svelte/catalog/compositions/appearance-preview/AppearancePreview.svelte";
    import ThemePreview from "@desert/svelte/catalog/foundations/theme-preview/ThemePreview.svelte";
  </script>${["dark", "light"].map(mode => `<div data-case="${mode}" style="width:12rem">${foundation ? "<ThemePreview" : "<AppearancePreview"} mode="${mode}" tint="rose" wallpaper="mist" /></div>`).join("")}`;
  // AppearancePreview as it was, before it became a ThemePreview delegate (tests/fixtures/appearance-before.ts).
  const before = Object.fromEntries(Object.entries(appearancePreviewBefore).map(([path, source]) => [resolve(import.meta.dirname, "..", path), source]));
  const css = await rendererCss(Object.values(appearancePreviewBefore));
  const [was, is] = [await renderCases(preview(false), before, css), await renderCases(preview(true), {}, css)];
  try {
    const parts = (foundation: boolean) => ({ root: "[data-appearance-preview]", panes: '.material-pane', lines: '.material-pane > span',
      wallpaper: "[data-system-wallpaper]", glyph: foundation ? ".preview-glyph" : "strong" });
    const probes = (foundation: boolean): Probes => ({ dark: parts(foundation), light: parts(foundation) });
    const [old, now] = [await measureProbes(was.page, probes(false)), await measureProbes(is.page, probes(true))];
    // The smaller glyph moves the centred content column a fraction of a pixel and the grid's tracks with it: panes and
    // lines keep their heights and paint; the frame and the wallpaper are compared whole.
    const rows = (value: typeof old, mode: string, part: string) => value[mode]?.[part]?.map(item => ({ ...item, box: [item.box[3]] }));
    for (const mode of ["dark", "light"]) {
      for (const part of ["root", "wallpaper"]) assert.deepEqual(now[mode]?.[part], old[mode]?.[part], `${mode}/${part}`);
      for (const part of ["panes", "lines"]) {
        const strip = (value: typeof old) => JSON.parse(JSON.stringify(rows(value, mode, part)), (key, item) => key === "max-width" ? undefined : item);
        assert.deepEqual(strip(now), strip(old), `${mode}/${part}`);
      }
    }
    const glyph = await is.page.locator('[data-case="light"] .preview-glyph').evaluate(element => {
      const style = getComputedStyle(element), root = getComputedStyle(document.documentElement);
      return [style.fontSize, style.lineHeight, style.fontWeight, root.getPropertyValue("--text-page").trim()];
    });
    assert.deepEqual(glyph.slice(0, 3), [`${Number.parseFloat(glyph[3] ?? "0") * 16}px`, "28px", "600"]);
    assert.deepEqual([was.errors, is.errors], [[], []]);
  } finally { await was.close(); await is.close(); }
});

// The appearance preview's accessibility guarantees (tests/appearance-preview-accessibility.test.ts), on ThemePreview.
test("theme-preview: previews preserve their own material border and accessibility preferences", async () => {
  const f = await svelteBrowser(`<script>
    import ThemePreview from '@desert/svelte/catalog/foundations/theme-preview/ThemePreview.svelte';
  </script><ThemePreview mode="dark" tint="rose" wallpaper="mist"/>
  <ThemePreview mode="light" tint="rose" wallpaper="mist"/>`, {}, undefined, { initialCss: await rendererCss() });
  try {
    const cdp = await f.page.context().newCDPSession(f.page);
    for (const contrast of ["no-preference", "more"]) for (const transparency of ["no-preference", "reduce"]) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-color-scheme", value: "dark" }, { name: "prefers-contrast", value: contrast },
        { name: "prefers-reduced-transparency", value: transparency },
      ] });
      const paints = await f.page.locator("[data-appearance-preview]").evaluateAll((items, highContrast) => {
        const context = document.createElement("canvas").getContext("2d")!;
        const rgba = (paint: string) => {
          context.clearRect(0, 0, 1, 1); context.fillStyle = paint; context.fillRect(0, 0, 1, 1);
          return [...context.getImageData(0, 0, 1, 1).data];
        };
        return items.map(item => {
          const root = getComputedStyle(item), pane = getComputedStyle(item.querySelector('.material-pane')!);
          return { mode: item.getAttribute("data-appearance-preview"), border: rgba(pane.borderTopColor),
            expected: rgba(highContrast ? root.color : root.getPropertyValue("--border")),
            alpha: rgba(pane.backgroundColor)[3], filter: pane.backdropFilter };
        });
      }, contrast === "more");
      for (const paint of paints) {
        assert.deepEqual(paint.border, paint.expected, `${paint.mode}: ${contrast} border follows preview appearance, not its parent's theme`);
        const opaque = contrast === "more" || transparency === "reduce";
        assert.ok(Math.abs(paint.alpha! - (opaque ? 255 : 224)) <= 1);
        assert.equal(paint.filter === "none", opaque);
      }
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
