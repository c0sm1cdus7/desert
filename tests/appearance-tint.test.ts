import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const luminance = (rgb: number[]) => rgb.slice(0, 3).map(v => v / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i]!, 0);
const contrast = (a: number[], b: number[]) =>
  (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const composite = (paint: number[], base: number[]) => paint.slice(0, 3)
  .map((channel, i) => channel * paint[3]! / 255 + base[i]! * (1 - paint[3]! / 255));
function sameHue(paint: number[], tone: number[], minimumChroma = 10) {
  const centered = (rgb: number[]) => rgb.slice(0, 3).map(v => v - rgb.slice(0, 3).reduce((a, b) => a + b, 0) / 3);
  const a = centered(paint), b = centered(tone);
  const similarity = a.reduce((sum, v, i) => sum + v * b[i]!, 0) / Math.hypot(...a) / Math.hypot(...b);
  return Math.max(...paint.slice(0, 3)) - Math.min(...paint.slice(0, 3)) >= minimumChroma && similarity > .85;
}

// Behavioral color expectations precede the tint implementation. This uses real
// shared faces/controls, not a reimplementation of their proposed color mixes.
test("semantic faces retain tint while every pane shares neutral material and accessibility preferences", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import * as Avatar from '@desert/svelte/vendor/components/ui/avatar/index.js';
    import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
    import * as InputGroup from '@desert/svelte/vendor/components/ui/input-group/index.js';
    import Face from '@desert/svelte/catalog/foundations/face/Face.svelte';
    import SearchIcon from '@lucide/svelte/icons/search';
    const photo = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Cpath fill="%238e6352" d="M0 0h40v40H0z"/%3E%3C/svg%3E';
  </script><main style="padding:24px">
    <section data-reading style="display:flex;gap:20px;padding:24px;background:var(--card)">
      {#each ['person','object'] as shape}
        <Avatar.Root {shape} size="lg"><Avatar.Fallback initials="SL"/></Avatar.Root>
        <Avatar.Root {shape} size="lg"><Avatar.Image src={photo} alt="Portrait"/><Avatar.Fallback initials="AR"/></Avatar.Root>
      {/each}
      <Face face={{kind:'document'}}/><Face face={{kind:'status',severity:'warning'}}/><Face face={{kind:'status',severity:'error'}}/>
    </section>
    <div style="--catalog-toolbar-height:36px;padding:16px 0"><Button variant="secondary" data-catalog-search-toggle aria-label="Search"><SearchIcon/></Button></div>
    <InputGroup.Root data-well><InputGroup.Input aria-label="Unchanged reading well" value="Neutral content"/></InputGroup.Root>
    <div data-material="pane" data-material-probe="surface"></div>
    <div data-material="pane" data-material-probe="floating" class="floating-pane"></div>
    <div data-material="pane" data-material-probe="search" style="position:relative;height:24px"></div>
  </main>`);
  const directory = new URL(`../artifacts/appearance-tint/${process.env.TINT_EVIDENCE ?? "current"}/`, import.meta.url);
  const failures: string[] = [];
  try {
    await mkdir(directory, { recursive: true });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 720, height: 320 });
    await f.page.locator("img").first().waitFor();
    const cdp = await f.page.context().newCDPSession(f.page);
    for (const scheme of ["light", "dark"]) for (const highContrast of [false, true]) for (const reduced of [false, true]) {
      const name = `${scheme}-${highContrast ? "contrast" : "normal"}-${reduced ? "opaque" : "glass"}`;
      await cdp.send("Emulation.setEmulatedMedia", { features: [
        { name: "prefers-color-scheme", value: scheme }, { name: "prefers-contrast", value: highContrast ? "more" : "no-preference" },
        { name: "prefers-reduced-transparency", value: reduced ? "reduce" : "no-preference" }, { name: "prefers-reduced-motion", value: "reduce" },
      ] });
      const observed = await f.page.evaluate(() => {
        const context = document.createElement("canvas").getContext("2d")!;
        const rgba = (value: string) => { context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
        const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
        const root = getComputedStyle(document.documentElement);
        const faces = [...document.querySelectorAll('[data-slot="avatar"], [data-piece="face"]')].map(face => {
          const css = getComputedStyle(face), border = getComputedStyle(face, "::after"), fallback = face.querySelector('[data-slot="avatar-fallback"], [data-face-content]');
          const image = face.querySelector("img"), photo = image ? getComputedStyle(image) : null;
          return { tone: face.getAttribute("data-tone") ?? "neutral", fill: rgba(css.backgroundColor), border: rgba(border.borderTopColor),
            text: fallback ? rgba(getComputedStyle(fallback).color) : null, glyph: !!face.querySelector("svg"),
            photo: photo ? { filter: photo.filter, blend: photo.mixBlendMode, opacity: photo.opacity, rootFilter: css.filter } : null };
        });
        const glass = style('[data-catalog-search-toggle]');
        return { faces, accent: rgba(root.getPropertyValue("--primary-text")), warning: rgba(root.getPropertyValue("--warning")), error: rgba(root.getPropertyValue("--destructive")),
          card: rgba(style('[data-reading]').backgroundColor), canvas: rgba(root.backgroundColor), well: rgba(style('[data-well]').backgroundColor),
          glass: { fill: rgba(glass.backgroundColor), filter: glass.backdropFilter },
          materials: [...document.querySelectorAll('[data-material="pane"]')].map(element => ({ name: element.getAttribute("data-material-probe") ?? element.getAttribute('data-slot'),
            fill: rgba(getComputedStyle(element).backgroundColor), filter: getComputedStyle(element).backdropFilter })) };
      });
      const check = (valid: boolean, message: string) => { if (!valid) failures.push(`${name}: ${message}`); };
      const dark = scheme === "dark", opaque = highContrast || reduced;
      const card = dark ? [41, 41, 41, 255] : [255, 255, 255, 255], canvas = dark ? [30, 30, 30, 255] : [245, 245, 247, 255];
      check(JSON.stringify(observed.card) === JSON.stringify(card), "reading card stays neutral and unchanged");
      check(JSON.stringify(observed.canvas) === JSON.stringify(canvas), "reading canvas stays neutral and unchanged");
      check(JSON.stringify(observed.well) === JSON.stringify(observed.glass.fill), "input well and button share the same material");
      for (const [index, face] of observed.faces.entries()) {
        const tone = face.tone === "warning" ? observed.warning : face.tone === "error" ? observed.error : observed.accent;
        check(face.fill[3] === 255 && contrast(face.fill, observed.card) >= 1.1, `face ${index}: own opaque, perceptible fill`);
        check(sameHue(face.fill, tone), `face ${index}: perceptible ${face.tone} hue in fill`);
        check(contrast(composite(face.border, face.fill), face.fill) >= (highContrast ? 3 : 1.2), `face ${index}: perceptible border`);
        if (!highContrast) check(sameHue(composite(face.border, face.fill), tone), `face ${index}: semantic tint reaches border`);
        if (face.text) check(contrast(face.text, face.fill) >= (face.glyph ? 3 : 4.5), `face ${index}: readable ${face.glyph ? "glyph" : "initials"}`);
        if (face.photo) check(face.photo.filter === "none" && face.photo.rootFilter === "none" && face.photo.blend === "normal" && face.photo.opacity === "1", `face ${index}: photograph is not recolored`);
      }
      check(new Set(observed.faces.slice(-3).map(face => JSON.stringify(face.fill))).size === 3, "document, warning and error fills remain distinct");
      check(Math.abs(observed.glass.fill[3]! - (opaque ? 255 : 224)) <= 1, "small and large panes share the same opacity");
      check(opaque ? observed.glass.filter === "none" : /blur/.test(observed.glass.filter), "small Glass respects accessibility material preferences");
      for (const material of observed.materials) {
        const expected = canvas;
        check(material.fill.slice(0, 3).every((value, i) => Math.abs(value - expected[i]!) <= 1), `${material.name}: larger material stays neutral`);
        const alpha = opaque ? 255 : 224;
        check(Math.abs(material.fill[3]! - alpha) <= 1, `${material.name}: established opacity is unchanged`);
        check(opaque ? material.filter === "none" : /blur/.test(material.filter), `${material.name}: accessibility material behavior is unchanged`);
      }
      await writeFile(new URL(`${name}.json`, directory), JSON.stringify({ observed, failures: failures.filter(value => value.startsWith(name + ":")) }, null, 2));
      await f.page.screenshot({ path: new URL(`${name}.png`, directory).pathname });
    }
    assert.equal(await f.page.locator('[data-slot="avatar"], [data-piece="face"]').count(), 7);
    assert.deepEqual(f.errors, []);
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});
