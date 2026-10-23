import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import SurfaceFrame from "@desert/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte";
  import { surfaceFrame, SurfaceFrameVersion } from "@desert/interaction/surface-frame.ts";
  import { transientFrame } from "@desert/interaction/transient-frame.ts";
  import { toolbarAction } from "@desert/interaction/toolbar.ts";
  let observed = $state("");
  let frame = transientFrame(surfaceFrame({ version:SurfaceFrameVersion, kind:"journey",
    top:{ title:"Long toolbar with twenty independently named available actions", trailing:Array.from({length:20}, (_, i) =>
      toolbarAction({kind:"journey",journey:"utility-"+i}, "Utility "+i, "open")) },
    content:{kind:"message",text:"Content remains within the shared frame."},
    bottom:{primary:toolbarAction({kind:"accept"},"Confirm the independently named operation","confirm")} }), false);
  </script>
  <div data-geometry-host style="width:360px;display:flex;flex-direction:column;min-width:0">
    <SurfaceFrame {frame} invoke={intent => { observed = JSON.stringify(intent); }} />
  </div>
  <output data-observed>{observed}</output>`;

test("twenty utilities stay bounded and reachable through the canonical overflow surface", { timeout: 30000 }, async t => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.setViewportSize({ width: 1280, height: 900 });
    const host = f.page.locator("[data-geometry-host]");
    const header = host.locator('[data-surface-slot="top"]');
    for (const width of [960, 360, 240]) for (const scale of [1, 2]) {
      await host.evaluate((node, width) => { (node as HTMLElement).style.width = `${width}px`; }, width);
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      await f.page.waitForTimeout(100);
      const result = await header.evaluate(node => {
        const bounds = node.getBoundingClientRect();
        return { width: bounds.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
          headingWidth: node.querySelector("h2")!.getBoundingClientRect().width,
          buttons: [...node.querySelectorAll("button")].map(button => {
            const rect = button.getBoundingClientRect();
            return { left: rect.left - bounds.left, right: rect.right - bounds.left, width: rect.width };
          }) };
      });
      t.diagnostic(JSON.stringify({ hostWidth: width, scale, ...result }));
      assert.ok(result.scrollWidth <= result.clientWidth + 1, "header has no horizontal overflow");
      assert.ok(result.headingWidth > 20, "navigation and utilities cannot erase the title");
      assert.ok(result.buttons.every(button => button.left >= -1 && button.right <= result.width + 1 && button.width >= 44),
        "every visible action retains a reachable target inside its frame");
      const footer = host.locator('[data-surface-slot="bottom"]');
      const widths = await footer.locator("button").evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().width));
      assert.equal(widths.length, 2);
      assert.ok(Math.abs(widths[0]! - widths[1]!) < 1, "return and primary share the bottom rail evenly");
      assert.equal(await footer.locator('[data-emphasis="primary"]').count(), 1);
      const more = header.getByRole("button", { name: "More actions", exact: true });
      await more.click();
      const popup = f.page.getByRole("dialog");
      await popup.waitFor();
      assert.equal(await popup.locator('[data-surface-slot]').count(), 0);
      assert.equal(await f.page.locator('.scrim').count(), 0);
      assert.ok(await popup.getByRole("button", { name: "Utility 19", exact: true }).isVisible());
      await f.page.keyboard.press("Escape");
      await popup.waitFor({ state: "hidden" });
      assert.equal(await more.evaluate(node => document.activeElement === node), true, "overflow returns focus to the same trigger");
    }
    await header.getByRole("button", { name: "More actions", exact: true }).click();
    await f.page.getByRole("dialog").getByRole("button", { name: "Utility 19", exact: true }).click();
    assert.deepEqual(JSON.parse(await f.page.locator("[data-observed]").innerText()), { kind: "journey", journey: "utility-19" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
