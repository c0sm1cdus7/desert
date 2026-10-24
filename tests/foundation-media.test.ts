// Slice 3 (F1.8): MediaViewer (from the viewer, zoom-controls and toolbar-media-controls) runs the media lifecycle the
// viewer ran (tests/media-playback-browser.test.ts, same assertions), with MediaPlayer's own controls and its
// controller kept inside it; Gallery (from photo-collection) pages, opens the viewer and gets focus back; the
// media-gestures mechanism moved out of infra.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Page } from "playwright";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { treeViolations } from "./fixtures/tree-violations.ts";

const video = readFileSync(new URL("./fixtures/media-motion-study.webm", import.meta.url));
const audio = Buffer.alloc(44 + 48000 * 2);
audio.write("RIFF"); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVEfmt ", 8);
audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32);
audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(audio.length - 44, 40);
const source = `<script>
 import MediaViewer from './src/svelte/catalog/foundations/media-viewer/MediaViewer.svelte';
 let open=$state(false), index=$state(0);
 const items=[{kind:'video',source:'/media/film',alt:'Motion study',captions:[{source:'/media/captions',language:'en',label:'English'}]},
 {kind:'audio',source:'/media/audio',alt:'Silence',captions:[]}];
 </script><button onclick={()=>open=true}>Open media</button>
 {#if open}<MediaViewer {items} title="Studio" {open} {index} onopenchange={value=>open=value} onindex={value=>index=value}/>{/if}`;

async function serveMedia(page: Page) {
  await page.route("**/media/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/media/captions") return route.fulfill({ contentType: "text/vtt",
      body: "WEBVTT\n\n00:00.000 --> 00:06.000\nA moving circle, without sound.\n" });
    const body = path === "/media/film" ? video : audio;
    const contentType = path === "/media/film" ? "video/webm" : "audio/wav";
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
    const start = Number(range?.[1] ?? 0), end = range?.[2] ? Number(range[2]) : body.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType, body: body.subarray(start, end + 1),
      headers: { "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1),
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${body.length}` } : {}) } });
  });
}

test("gallery, media-player, media-viewer, theme-preview and media-gestures draw only their own marks and cover every state and variant", async () => {
  const found = await treeViolations(["gallery", "media-player", "media-viewer", "theme-preview"].map(id => `src/svelte/catalog/foundations/${id}/`)
    .concat("src/svelte/catalog/mechanisms/media-gestures/"), ["E", "F", "G", "H", "I", "J"]);
  // F1-merge: the viewer mounts the vendor dialog until Modal (F1d) and ToolbarLayout until Bar (F1f); Action's contract
  // is a stub until F1b closes it; toggles and thumbnails press through the vendor button's attachment.
  const merging = (line: string) => /^VENDOR_OUTSIDE_OWNER: .*imports vendor family (dialog|button)/.test(line)
    || /^PRESENTATION_ESCAPE: .*<(Action|ToolbarLayout)> passes/.test(line);
  assert.deepEqual(found.filter(line => !merging(line)), []);
});

for (const width of [390, 1600]) test(`media-viewer: the shared media playback lifecycle at ${width}px`, async () => {
  const f = await svelteBrowser(source, {}, "http://media.test/");
  try {
    const { page } = f;
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await serveMedia(page);
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole("button", { name: "Open media", exact: true }).click();
    const viewer = page.locator("[data-media-viewer]");
    await page.waitForFunction(() => (document.querySelector("video")?.readyState ?? 0) >= 1);
    assert.equal(await page.locator("video").evaluate(element => element instanceof HTMLVideoElement && element.paused), true);
    await viewer.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("video")?.currentTime ?? 0) > .1);
    await viewer.getByRole("button", { name: "Pause", exact: true }).click();
    await viewer.getByRole("slider", { name: "Playback position", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    for (const track of await viewer.locator('[data-slot="slider-track"]').all()) {
      assert.ok((await track.boundingBox())!.height >= 4, "shared slider track remains visible");
    }
    const captions = viewer.getByRole("button", { name: "Captions", exact: true });
    assert.equal(await captions.getAttribute("aria-pressed"), "false");
    await captions.click();
    assert.equal(await captions.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("video").evaluate(element => element instanceof HTMLVideoElement ? element.textTracks[0]?.mode : null), "showing");
    const previous = await page.locator("video").elementHandle();
    await viewer.getByRole("button", { name: "Next media", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("audio")?.readyState ?? 0) >= 1);
    assert.equal(await previous!.evaluate(element => element instanceof HTMLVideoElement && element.paused), true);
    assert.equal(await previous!.getAttribute("src"), null);
    await viewer.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("audio")?.currentTime ?? 0) > .1);
    await viewer.getByRole("button", { name: "Mute", exact: true }).click();
    assert.equal(await page.locator("audio").evaluate(element => element instanceof HTMLAudioElement && element.muted), true);
    await viewer.getByRole("slider", { name: "Volume", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("audio").evaluate(element => element instanceof HTMLAudioElement && element.muted), false);
    await viewer.getByRole("slider", { name: "Playback position", exact: true }).focus();
    await page.keyboard.press("End");
    await page.waitForFunction(() => (document.querySelector("audio")?.currentTime ?? 0) >= 5.9);
    assert.equal(await viewer.evaluate(element => element.scrollWidth > element.clientWidth), false);
    const previousAudio = await page.locator("audio").elementHandle();
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "hidden" });
    assert.equal(await previousAudio!.evaluate(element => element instanceof HTMLAudioElement && element.paused), true);
    assert.equal(await previousAudio!.getAttribute("src"), null);
    assert.equal(await page.getByRole("button", { name: "Open media", exact: true }).evaluate(element => element === document.activeElement), true,
      "focus returns to the element that opened the viewer");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("media-player: failed playback is recoverable without an autoplay or loading indicator", async () => {
  const f = await svelteBrowser(source, {}, "http://media.test/");
  try {
    let fail = true;
    await f.page.route("**/media/film", route => route.fulfill(fail ? { status: 503, body: "Unavailable" }
      : { contentType: "video/webm", body: video, headers: { "Accept-Ranges": "bytes" } }));
    await f.page.route("**/media/captions", route => route.fulfill({ contentType: "text/vtt", body: "WEBVTT\n" }));
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: "Open media", exact: true }).click();
    await f.page.getByText("Media unavailable", { exact: true }).waitFor();
    assert.equal(await f.page.getByText("Loading image", { exact: true }).count(), 0);
    assert.equal(await f.page.getByRole("progressbar").count(), 0);
    fail = false;
    await f.page.getByRole("button", { name: "Retry", exact: true }).click();
    await f.page.waitForFunction(() => (document.querySelector("video")?.readyState ?? 0) >= 1);
    await f.page.getByText("Media unavailable", { exact: true }).waitFor({ state: "hidden" });
    assert.equal(await f.page.locator("video").evaluate(element => element instanceof HTMLVideoElement && element.paused), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("media-player: different queue entries sharing an asset restart with independent playback state", async () => {
  const sameAsset = source.replace("{kind:'audio',source:'/media/audio',alt:'Silence',captions:[]}",
    "{kind:'video',source:'/media/film',alt:'Second cut',captions:[]}");
  const f = await svelteBrowser(sameAsset, {}, "http://media.test/");
  try {
    await f.page.route("**/media/film", route => route.fulfill({ contentType: "video/webm", body: video }));
    await f.page.route("**/media/captions", route => route.fulfill({ contentType: "text/vtt", body: "WEBVTT\n" }));
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole("button", { name: "Open media", exact: true }).click();
    const viewer = f.page.locator("[data-media-viewer]");
    await viewer.getByRole("button", { name: "Play", exact: true }).click();
    await f.page.waitForFunction(() => (document.querySelector("video")?.currentTime ?? 0) > .2);
    const previous = await f.page.locator("video").elementHandle();
    await viewer.getByRole("button", { name: "Next media", exact: true }).click();
    assert.equal(await previous!.evaluate(element => element.isConnected), false);
    await f.page.waitForFunction(() => (document.querySelector("video")?.readyState ?? 0) >= 1);
    assert.equal(await f.page.locator("video").evaluate(element => element instanceof HTMLVideoElement ? element.currentTime : -1), 0);
    assert.equal(await f.page.locator("video").evaluate(element => element instanceof HTMLVideoElement && element.paused), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("gallery: pages by dots and keys, opens the viewer on its photo, zooms, and gets focus back on close", async () => {
  const photo = (fill: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23${fill}'/%3E%3C/svg%3E`;
  const f = await svelteBrowser(`<script>
    import Gallery from './src/svelte/catalog/foundations/gallery/Gallery.svelte';
    const photos = [{ source: "${photo("468")}", alt: "Lake" }, { source: "${photo("864")}", alt: "Dunes" }];
  </script><main style="width:480px;height:320px"><Gallery {photos} title="Trip" presentation="inline" fit="fill" aspect="landscape" /></main>`,
  {}, undefined, { initialCss: await rendererCss() });
  try {
    const { page } = f;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const opener = page.getByRole("button", { name: "Open photo viewer", exact: true });
    assert.equal(await page.getByRole("button", { name: "Photo 1: Lake" }).getAttribute("aria-current"), "true");
    await opener.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("button", { name: "Photo 2: Dunes" }).getAttribute("aria-current"), "true");
    await page.getByRole("button", { name: "Photo 1: Lake" }).click();
    await opener.click();
    const viewer = page.locator("[data-media-viewer]");
    await viewer.locator('[data-media-stage] [data-image-state="ready"]').waitFor();
    assert.equal(await viewer.getByText("1 / 2", { exact: true }).count(), 1);
    await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
    assert.match(await viewer.locator("[data-media-stage] img").evaluate(element => element instanceof HTMLElement ? element.style.transform : ""), /scale\(2\)/);
    assert.equal(await viewer.getByRole("button", { name: "Next media", exact: true }).isDisabled(), true, "paging waits while zoomed");
    await page.keyboard.press("0");
    await page.keyboard.press("ArrowRight");
    assert.equal(await viewer.getByText("2 / 2", { exact: true }).count(), 1);
    await viewer.getByRole("button", { name: "Media 1: Lake" }).click();
    assert.equal(await viewer.getByText("1 / 2", { exact: true }).count(), 1);
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "hidden" });
    assert.equal(await opener.evaluate(element => element === document.activeElement), true, "focus returns to the opener");
    assert.equal(await page.getByRole("button", { name: "Photo 1: Lake" }).getAttribute("aria-current"), "true");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
