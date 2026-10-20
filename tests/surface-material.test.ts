import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

test("transient materials preserve context and respect reduced transparency, including draggable sheets", async () => {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Drawer from '@desert/svelte/pieces/Drawer.svelte';
    import { SurfaceFrameVersion } from '@desert/interaction/surface-frame.ts';
    let open = $state(false);
    const frame = {version:SurfaceFrameVersion,kind:'specimen',top:{title:'Context'},
      content:{kind:'information',items:[{kind:'text',text:'Keep the source page recognizable.'}]},bottom:{}};
  </script><main data-surface-host><button onclick={()=>open=true}>Open context</button>
    <Drawer label="Context" {frame} {open} onclose={()=>open=false} invoke={()=>{}} /></main>`);
  try {
    await fixture.page.addStyleTag({ content: await rendererCss() });
    const media = await fixture.page.context().newCDPSession(fixture.page);
    for (const profile of ["default", "apple-reference"]) for (const width of [900, 390]) {
      await fixture.page.setViewportSize({ width, height: 740 });
      await fixture.page.evaluate(profile => { document.documentElement.dataset.rendererProfile = profile; }, profile);
      for (const preference of ["no-preference", "reduce"]) {
        await media.send("Emulation.setEmulatedMedia", { features: [
          { name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-reduced-transparency", value: preference },
        ] });
        await fixture.page.getByRole("button", { name: "Open context", exact: true }).click();
        const panel = fixture.page.getByRole("dialog", { name: "Context", exact: true });
        await panel.waitFor();
        const material = await panel.evaluate(element => {
          const overlay = document.querySelector<HTMLElement>(".scrim")!;
          const style = getComputedStyle(overlay), pane = getComputedStyle(element);
          const canvas = new OffscreenCanvas(1, 1), context = canvas.getContext("2d")!;
          context.fillStyle = style.backgroundColor; context.fillRect(0, 0, 1, 1);
          return { alpha: context.getImageData(0, 0, 1, 1).data[3]! / 255,
            overlayBlur: style.backdropFilter, paneBlur: pane.backdropFilter,
            reduced: matchMedia("(prefers-reduced-transparency:reduce)").matches };
        });
        assert.ok(material.alpha > 0 && material.alpha < .8, `${profile}/${width}: scrim dims, never replaces the source page`);
        assert.equal(material.reduced, preference === "reduce");
        if (preference === "reduce") {
          assert.equal(material.overlayBlur, "none", "inline drag feedback must not override accessibility");
          assert.equal(material.paneBlur, "none");
        }
        await fixture.page.keyboard.press("Escape");
        await panel.waitFor({ state: "hidden" });
      }
    }
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
