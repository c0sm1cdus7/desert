// One notice for unavailable media (fourth review of the slice 3 package, law 9b): an image that cannot load showed a grey
// panel without an edge, and unavailable media standing by itself («Media unavailable») a white bordered box that read as
// an input. Every unavailable notice standing in its own frame (an image's error with its retry, unavailable media, a
// player's error) is one anatomy: the same ground, edge, corner, inset and ink; its edge shows on the page, light and dark;
// and its ground is never a face's or a well's white.
import assert from "node:assert/strict";
import test from "node:test";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { renderCases } from "./fixtures/parity.ts";

const source = `<script lang="ts">
  import Image from "@desert/svelte/catalog/foundations/image/Image.svelte";
  import MediaPlayer from "@desert/svelte/catalog/foundations/media-player/MediaPlayer.svelte";
  const video = { kind: "video", source: "/media/missing.mp4", alt: "Harbour", captions: [] } as const;
</script>
<main style="display:grid;gap:24px;padding:16px;width:358px;background:var(--background)">
  <div data-case="image-error"><Image source="/media/missing-photo.jpg" alt="Missing photo" retry fallback="Image unavailable" /></div>
  <div data-case="image-error-framed" style="height:180px"><Image source="/media/missing-photo.jpg" alt="Missing photo" retry fallback="Image unavailable" /></div>
  <div data-case="media-unavailable"><Image placeholder="unavailable" fallback="Media unavailable" /></div>
  <div data-case="player-error"><MediaPlayer item={video} presentation="inline" /></div>
</main>`;

function read() {
  const rgba = (color: string) => { const c = new OffscreenCanvas(1, 1).getContext("2d")!; c.fillStyle = color; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data]; };
  const over = (top: number[], under: number[]) => top.slice(0, 3).map((v, i) => v * top[3]! / 255 + under[i]! * (1 - top[3]! / 255));
  const luminance = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * r! + .7152 * g! + .0722 * b!; };
  const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05); };
  const page = rgba(getComputedStyle(document.querySelector("main")!).backgroundColor);
  const white = rgba(getComputedStyle(document.documentElement).getPropertyValue("--card"));
  return [...document.querySelectorAll("[data-case]")].map(scope => {
    const notice = scope.querySelector("[data-media-notice]");
    if (!notice) return { case: scope.getAttribute("data-case")!, notice: false };
    const style = getComputedStyle(notice), ground = over(rgba(style.backgroundColor), page.slice(0, 3));
    const edge = over(rgba(style.borderTopColor), ground);
    const sentence = [...notice.querySelectorAll("span")].find(span => span.textContent?.trim().endsWith("unavailable"));
    return { case: scope.getAttribute("data-case")!, notice: true,
      anatomy: { ground: style.backgroundColor, edge: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
        corner: style.borderTopLeftRadius, inset: style.paddingTop + " " + style.paddingLeft, ink: style.color,
        sentence: sentence ? `${getComputedStyle(sentence).fontSize} ${getComputedStyle(sentence).fontWeight}` : "none", align: style.alignItems },
      edgeOnPage: Math.round(contrast(edge, page.slice(0, 3)) * 100) / 100,
      white: ground.every((v, i) => Math.abs(v - white[i]!) < 3) };
  });
}

test("every unavailable notice standing alone is one anatomy, its edge seen on the page", { timeout: 60000 }, async () => {
  const f = await renderCases(source, {}, await rendererCss(), { width: 390, height: 1200 });
  try {
    await f.page.waitForFunction(() => document.querySelectorAll("[data-media-notice]").length >= 4, undefined, { timeout: 20000 }).catch(() => undefined);
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await f.page.evaluate(async () => { for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame); });
      const found = await f.page.evaluate(read), seen = JSON.stringify(found, null, 1);
      assert.deepEqual(found.filter(item => !item.notice).map(item => item.case), [], `${colorScheme}: every case shows its notice: ${seen}`);
      const [first] = found;
      for (const item of found) {
        assert.deepEqual(item.anatomy, first!.anatomy, `${colorScheme}: ${item.case} has the one notice anatomy: ${seen}`);
        assert.ok(item.edgeOnPage! >= 1.4, `${colorScheme}: ${item.case}'s edge shows on the page (${item.edgeOnPage}:1): ${seen}`);
        assert.equal(item.white, false, `${colorScheme}: ${item.case} is no face or well: ${seen}`);
      }
    }
    assert.deepEqual(f.errors.filter(error => !/Failed to load resource/.test(error)), []);
  } finally { await f.close(); }
});
