import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdirSync } from "node:fs";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const video = readFileSync(new URL("./fixtures/media-motion-study.webm", import.meta.url));
const audio = Buffer.alloc(44 + 48000 * 2);
audio.write("RIFF"); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVEfmt ", 8);
audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22);
audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32);
audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(audio.length - 44, 40);
const source = `<script>
 import Viewer from './src/svelte/pieces/media/Viewer.svelte';
 let open=$state(false), index=$state(0);
 const items=[{kind:'video',source:'/media/film',alt:'Motion study',captions:[{source:'/media/captions',language:'en',label:'English'}]},
 {kind:'audio',source:'/media/audio',alt:'Silence',captions:[]}];
 </script><button onclick={()=>open=true}>Open media</button>
 {#if open}<Viewer {items} title="Studio" {open} {index} onopen={value=>open=value} onindex={value=>index=value} onreturn={()=>{}}/>{/if}`;

for (const width of [390, 1600]) test(`native shared media playback lifecycle at ${width}px`, async () => {
  const f = await svelteBrowser(source, {}, "http://media.test/");
  try {
    const { page } = f;
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
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
    await page.addStyleTag({ content: await rendererCss() });
    await page.getByRole("button", { name: "Open media", exact: true }).click();
    const viewer = page.locator("[data-media-viewer]");
    await page.waitForFunction(() => document.querySelector("video")!.readyState >= 1);
    assert.equal(await page.locator("video").evaluate(element => (element as HTMLVideoElement).paused), true);
    await viewer.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("video")!.currentTime > .1);
    await viewer.getByRole("button", { name: "Pause", exact: true }).click();
    await viewer.getByRole("slider", { name: "Playback position", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    for (const track of await viewer.locator('[data-slot="slider-track"]').all()) {
      assert.ok((await track.boundingBox())!.height >= 4, "shared slider track remains visible");
    }
    await viewer.getByRole("button", { name: "Captions", exact: true }).click();
    assert.equal(await page.locator("video").evaluate(element => (element as HTMLVideoElement).textTracks[0]!.mode), "showing");
    const previous = await page.locator("video").elementHandle();
    mkdirSync("artifacts/media-playback", { recursive: true });
    await page.screenshot({ path: `artifacts/media-playback/video-${width}.png` });
    await viewer.getByRole("button", { name: "Next media", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("audio")?.readyState! >= 1);
    assert.equal(await previous!.evaluate(element => (element as HTMLVideoElement).paused), true);
    assert.equal(await previous!.getAttribute("src"), null);
    await viewer.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("audio")!.currentTime > .1);
    await viewer.getByRole("button", { name: "Mute", exact: true }).click();
    assert.equal(await page.locator("audio").evaluate(element => (element as HTMLAudioElement).muted), true);
    await viewer.getByRole("slider", { name: "Volume", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("audio").evaluate(element => (element as HTMLAudioElement).muted), false);
    await viewer.getByRole("slider", { name: "Playback position", exact: true }).focus();
    await page.keyboard.press("End");
    await page.waitForFunction(() => document.querySelector("audio")!.currentTime >= 5.9);
    await page.screenshot({ path: `artifacts/media-playback/audio-${width}.png` });
    assert.equal(await viewer.evaluate(element => element.scrollWidth > element.clientWidth), false);
    const previousAudio = await page.locator("audio").elementHandle();
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "hidden" });
    assert.equal(await previousAudio!.evaluate(element => (element as HTMLAudioElement).paused), true);
    assert.equal(await previousAudio!.getAttribute("src"), null);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("failed playback is recoverable without an autoplay or loading indicator", async () => {
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
    await f.page.waitForFunction(() => document.querySelector("video")!.readyState >= 1);
    await f.page.getByText("Media unavailable", { exact: true }).waitFor({ state: "hidden" });
    assert.equal(await f.page.locator("video").evaluate(element => (element as HTMLVideoElement).paused), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("different queue entries sharing an asset restart with independent playback state", async () => {
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
    await f.page.waitForFunction(() => document.querySelector("video")!.currentTime > .2);
    const previous = await f.page.locator("video").elementHandle();
    await viewer.getByRole("button", { name: "Next media", exact: true }).click();
    assert.equal(await previous!.evaluate(element => element.isConnected), false);
    await f.page.waitForFunction(() => document.querySelector("video")!.readyState >= 1);
    assert.equal(await f.page.locator("video").evaluate(element => (element as HTMLVideoElement).currentTime), 0);
    assert.equal(await f.page.locator("video").evaluate(element => (element as HTMLVideoElement).paused), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
