import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("appearance previews preserve their own material border and accessibility preferences", async () => {
  const f = await svelteBrowser(`<script>
    import AppearancePreview from '@desert/svelte/catalog/compositions/appearance-preview/AppearancePreview.svelte';
  </script><AppearancePreview mode="dark" tint="rose" wallpaper="mist"/>
  <AppearancePreview mode="light" tint="rose" wallpaper="mist"/>`, {}, undefined, { initialCss: await rendererCss() });
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
          const root = getComputedStyle(item), pane = getComputedStyle(item.querySelector('[data-material="pane"]')!);
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
    const evidence = new URL("../artifacts/appearance-round4/", import.meta.url);
    await mkdir(evidence, { recursive: true });
    await f.page.screenshot({ path: new URL("appearance-preview-high-contrast.png", evidence).pathname });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
