// The error state of Image and MediaPlayer is one state, laid out: its sentence and its retry take their own height when
// the host gives none (never clipped to the broken image's line), fill the frame when it gives one, and nothing else of
// the piece (the poster, the placeholder glyph, the header controls) draws under or over them.
import assert from "node:assert/strict";
import test from "node:test";
import type { Page } from "playwright";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { renderCases } from "./fixtures/parity.ts";

const source = `<script lang="ts">
  import Image from "@desert/svelte/catalog/foundations/image/Image.svelte";
  import MediaPlayer from "@desert/svelte/catalog/foundations/media-player/MediaPlayer.svelte";
  const video = { kind: "video", source: "/media/missing.mp4", alt: "Harbour", artwork: { source: "/bank-image.svg", alt: "Harbour" }, captions: [] } as const;
  const audio = { kind: "audio", source: "/media/missing.m4a", alt: "Interview", artwork: { source: "/bank-image.svg", alt: "Studio" }, captions: [] } as const;
  const placeholder = { kind: "audio", source: "/media/missing.m4a", alt: "Interview", captions: [] } as const;
</script>
<main style="display:grid;gap:24px;padding:16px;width:480px">
  <div data-case="image-free"><Image source="/media/missing-photo.jpg" alt="Missing photo" retry fallback="Image unavailable" /></div>
  <div data-case="image-framed" style="height:200px"><Image source="/media/missing-photo.jpg" alt="Missing photo" retry fallback="Image unavailable" /></div>
  {#each [["video", video], ["audio", audio], ["placeholder", placeholder]] as [name, item] (name)}
    <div data-case="{name}-inline"><MediaPlayer {item} presentation="inline" /></div>
    <div data-case="{name}-viewer" style="display:flex;flex-direction:column;height:360px"><MediaPlayer {item} presentation="viewer" /></div>
    <div data-case="{name}-header" style="height:300px"><MediaPlayer {item} presentation="header" /></div>
    <div data-case="{name}-header-free"><MediaPlayer {item} presentation="header" /></div>
  {/each}
</main>`;

const cases = ["image-free", "image-framed", ...["video", "audio", "placeholder"].flatMap(name =>
  ["inline", "viewer", "header", "header-free"].map(presentation => `${name}-${presentation}`))];

/** Per case: the error block's frame, its sentence and retry, and every other drawn part of the piece that meets them. */
function layout(page: Page) {
  return page.evaluate(cases => cases.map(name => {
    const host = document.querySelector(`[data-case="${name}"]`)!;
    host.scrollIntoView({ block: "start" }); // elementFromPoint sees only the viewport
    const piece = host.firstElementChild!, error = host.querySelector(name.startsWith("image") ? "[data-media-error]" : "[role='status']");
    if (!error) return { name, error: false };
    const drawn = (element: Element) => { const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility === "visible" && box.width > 0 && box.height > 0; };
    const sentence = [...error.querySelectorAll("span")].find(span => span.textContent?.trim().endsWith("unavailable"))!;
    const retry = error.querySelector("button")!;
    const marks = [sentence, retry].map(element => element.getBoundingClientRect());
    const frame = piece.getBoundingClientRect(), stage = error.parentElement!.getBoundingClientRect();
    const inside = (box: DOMRect, outer: DOMRect) => box.top >= outer.top - .5 && box.bottom <= outer.bottom + .5
      && box.left >= outer.left - .5 && box.right <= outer.right + .5;
    const meets = (box: DOMRect) => marks.some(mark => Math.min(box.right, mark.right) - Math.max(box.left, mark.left) > .5
      && Math.min(box.bottom, mark.bottom) - Math.max(box.top, mark.top) > .5);
    // Another drawn part meets the sentence or the retry unless the error lies over it there on an opaque ground.
    const ground = getComputedStyle(name.startsWith("image") ? piece : error).backgroundColor;
    const opaque = /^rgb\(/.test(ground) || /^(oklch|oklab|lab|lch|color)\([^/]*\)$/.test(ground);
    const covered = (box: DOMRect) => marks.every(mark => {
      const left = Math.max(box.left, mark.left), right = Math.min(box.right, mark.right), top = Math.max(box.top, mark.top), bottom = Math.min(box.bottom, mark.bottom);
      if (right - left <= .5 || bottom - top <= .5) return true;
      const point = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
      return opaque && !!point && error.contains(point);
    });
    const others = [...piece.querySelectorAll("video, img, svg, button, [role='slider'], [data-media-image], [data-media-artwork-placeholder]")]
      .filter(element => !error.contains(element) && !element.contains(error) && drawn(element) && meets(element.getBoundingClientRect())
        && !covered(element.getBoundingClientRect()))
      .map(element => element.getAttribute("aria-label") ?? element.tagName.toLowerCase());
    return { name, error: true, shown: marks.every((_, at) => drawn([sentence, retry][at]!)),
      clipped: !marks.every(mark => inside(mark, stage) && inside(mark, frame)), others,
      // An error with no height from its host stands taller than its sentence and retry together.
      height: Math.round(frame.height), content: Math.round(Math.max(...marks.map(mark => mark.bottom)) - Math.min(...marks.map(mark => mark.top))) };
  }), cases);
}

test("image and media-player: the error state is one state, laid out in its own height, never clipped or drawn over", { timeout: 60000 }, async () => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const f = await renderCases(source, {}, await rendererCss(), viewport);
    try {
      await f.page.waitForFunction(count => document.querySelectorAll("[data-media-error], [data-media-player-presentation] [role='status']").length >= count, cases.length);
      await f.page.evaluate(async () => { for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame); });
      const found = await layout(f.page);
      assert.deepEqual(found.filter(item => !item.error || !item.shown || item.clipped || item.others?.length),
        [], `${viewport.width}px: every error shows its sentence and retry alone, inside its frame`);
      for (const item of found) assert.ok((item.height ?? 0) >= (item.content ?? 0), `${item.name} is as tall as its error`);
      const framed = found.find(item => item.name === "image-framed");
      assert.equal(framed?.height, 200, "a framed image keeps its frame's height");
      assert.deepEqual(f.errors.filter(error => !/Failed to load resource/.test(error)), []);
    } finally { await f.close(); }
  }
});
