import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

for (const edge of ["left", "right", "bottom"] as const) test(`${edge}: shared swipe cancels perpendicular intent and unexpected capture loss`, async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import { swipeMotion } from '@desert/svelte/infra/swipe-motion.svelte.ts';
    let count = $state(0);
    const motion = swipeMotion({edge:()=> '${edge}', enabled:()=>true, commit:()=>count++});
  </script><button style="position:fixed;left:200px;top:200px;width:180px;height:80px;touch-action:none"
    data-offset={motion.offset} data-tracking={motion.tracking} data-dragging={motion.dragging}
    onpointerdown={motion.down} onpointermove={motion.move} onpointerup={motion.up}
    onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>Drag</button><output>{count}</output>`);
  try {
    const { page } = f, button = page.getByRole("button", { name: "Drag" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const x = 280, y = 240, sign = edge === "left" ? -1 : 1;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + (edge === "bottom" ? 20 : 0), y + (edge === "bottom" ? 0 : 20));
    assert.equal(await button.getAttribute("data-tracking"), "false");
    assert.equal(await button.getAttribute("data-offset"), "0");
    await page.mouse.up(); assert.equal(await page.locator("output").innerText(), "0");
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + (edge === "bottom" ? 0 : sign * 60), y + (edge === "bottom" ? 60 : 0));
    assert.equal(await button.getAttribute("data-offset"), "60");
    assert.equal(await button.getAttribute("data-dragging"), "true");
    await button.evaluate(element => element.releasePointerCapture(1));
    // Native capture changes are processed before the next pointer event.
    await page.mouse.move(x + (edge === "bottom" ? 0 : sign * 60), y + (edge === "bottom" ? 60 : 0));
    await page.waitForFunction(() => document.querySelector("button")?.getAttribute("data-tracking") === "false");
    assert.equal(await button.getAttribute("data-offset"), "0");
    await page.mouse.up(); assert.equal(await page.locator("output").innerText(), "0");
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + (edge === "bottom" ? 0 : sign * 140), y + (edge === "bottom" ? 140 : 0));
    assert.equal(await page.locator("output").innerText(), "0", "holding never commits");
    await page.mouse.up();
    assert.equal(await page.locator("output").innerText(), "1");
    assert.equal(await button.getAttribute("data-offset"), "140", "exit can start at the actual released offset");
    assert.deepEqual(f.errors, []);
  } finally { await f.page.mouse.up().catch(() => {}); await f.close(); }
});
