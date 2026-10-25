// A place heading's video keeps its controls fully legible (DESIGN §7 item 6; coordinator, review 2): the media player's
// header controls sat under the heading's shade and looked dim. The shade darkens the video for the title, never the
// controls: each control looks the same with the shade drawn or not (but for what its translucent pane lets through), and its glyph stands at least 3:1 against its own
// ground, in both themes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const video = readFileSync(new URL("./fixtures/media-motion-study.webm", import.meta.url));
const source = `<script lang="ts">
  import PlaceHeading from "@desert/svelte/catalog/foundations/place-heading/PlaceHeading.svelte";
</script>
<main style="width:100%"><PlaceHeading context="place" title="Studio" subtitle="A short film" media={{ kind: "video", asset: "film", alt: "Motion study" }} /></main>`;

function contrast(a: readonly number[], b: readonly number[]) {
  const luminance = (pixel: readonly number[]) => {
    const [r, g, bl] = pixel.map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * bl!;
  };
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + .05) / (y! + .05);
}

for (const scheme of ["light", "dark"] as const) test(`header video controls stand clear of the heading's shade · ${scheme}`, { timeout: 120000 }, async () => {
  const f = await svelteBrowser(source, {}, "http://media.test/");
  try {
    const { page } = f;
    await page.route("**/media/**", route => {
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
      const start = Number(range?.[1] ?? 0), end = range?.[2] ? Number(range[2]) : video.length - 1;
      return route.fulfill({ status: range ? 206 : 200, contentType: "video/webm", body: video.subarray(start, end + 1),
        headers: { "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1), ...(range ? { "Content-Range": `bytes ${start}-${end}/${video.length}` } : {}) } });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.addStyleTag({ content: await rendererCss() });
    const controls = page.locator("[data-media-player-presentation=header] button");
    await controls.first().waitFor();
    await page.waitForFunction(() => (document.querySelector("video")?.readyState ?? 0) >= 2);
    await page.waitForTimeout(300);
    const read = async () => Promise.all((await controls.all()).map(async control => {
      const box = (await control.boundingBox())!;
      const png = await page.screenshot({ clip: box });
      return page.evaluate(async (data: string) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height), context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, image.width, image.height).data;
        return Array.from({ length: image.width * image.height }, (_, index) => [...pixels.slice(index * 4, index * 4 + 3)]);
      }, png.toString("base64"));
    }));
    // Structurally: nothing between a control and the heading opens a stacking context below the heading's shade.
    const sunk = await controls.first().evaluate(control => {
      const found: string[] = [];
      for (let node = control.parentElement; node && !node.classList.contains("place-heading-content"); node = node.parentElement) {
        const z = getComputedStyle(node).zIndex;
        if (z !== "auto" && Number(z) < 0) found.push(`${node.className} z-index ${z}`);
      }
      return found;
    });
    assert.deepEqual(sunk, [], "the controls are not sunk under the shade");
    const shaded = await read();
    // The same controls with the heading's shade withdrawn (test-only): if the shade were over them, they would change.
    await page.addStyleTag({ content: ".place-heading-content::before { content:none !important; }" });
    await page.waitForTimeout(150);
    const clear = await read();
    assert.ok(shaded.length >= 2, "the header shows its transport and volume controls");
    for (const [index, pixels] of shaded.entries()) {
      const ground = pixels[Math.floor(pixels.length / 2) - Math.floor(Math.sqrt(pixels.length) / 2) + 4]!;
      const unshaded = clear[index]![Math.floor(pixels.length / 2) - Math.floor(Math.sqrt(pixels.length) / 2) + 4]!;
      // A control's pane is translucent (88%): the shaded video shows faintly through it, never the shade over it.
      assert.ok(contrast(ground, unshaded) < 1.25, `control ${index}: the shade darkens it (${ground} against ${unshaded} without the shade)`);
      const best = Math.max(...pixels.map(pixel => contrast(pixel, ground)));
      assert.ok(best >= 3, `control ${index}: its glyph reaches only ${best.toFixed(2)}:1 against its ground`);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
