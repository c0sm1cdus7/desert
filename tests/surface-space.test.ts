import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

// A side transient needs its readable pane plus two outer gaps. Docking needs
// an additional readable Place; these are independent space budgets.
async function fixture() {
  const f = await svelteBrowser(`<script lang="ts">
    import Drawer from '@desert/svelte/catalog/foundations/drawer/Drawer.svelte';
    import { provideSurfaceHost } from '@desert/svelte/catalog/mechanisms/surface-host/surface-host.svelte.ts';
    import { SurfaceFrameVersion } from '@desert/interaction/surface-frame.ts';
    let host = $state<HTMLElement|null>(null), open = $state(false);
    provideSurfaceHost(() => host);
    const frame = {version:SurfaceFrameVersion,kind:'specimen',top:{title:'Context'},
      content:{kind:'information',items:[{kind:'text',text:'Keep the source context visible.'}]},bottom:{}};
  </script><main bind:this={host} data-surface-host style="width:900px">
    <button onclick={()=>open=true}>Open task</button>
    <Drawer label="Context" {frame} {open} onclose={()=>open=false} invoke={()=>{}} />
  </main>`);
  await f.page.setViewportSize({ width: 1400, height: 900 });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.getByRole("button", { name: "Open task" }).click();
  await f.page.getByRole("dialog").waitFor();
  return f;
}

test("a task changes presentation when its owner loses space, without a viewport change", async () => {
  const f = await fixture();
  try {
    const pane = f.page.getByRole("dialog");
    assert.equal(await pane.getAttribute("data-edge"), "right");
    await f.page.evaluate(() => { document.querySelector<HTMLElement>("main")!.style.width = "599px"; });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "bottom");
    await f.page.evaluate(() => { document.querySelector<HTMLElement>("main")!.style.width = "900px"; });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "right");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("owner padding is not counted as available reading space", async () => {
  const f = await fixture();
  try {
    assert.equal(await f.page.getByRole("dialog").getAttribute("data-edge"), "right");
    await f.page.evaluate(() => {
      const owner = document.querySelector<HTMLElement>("main")!;
      owner.style.boxSizing = "border-box"; owner.style.paddingInline = "151px";
    });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "bottom");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("readable side pane budget follows text size and the available viewport", async () => {
  const f = await fixture();
  try {
    await f.page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "bottom");
    await f.page.evaluate(() => { document.documentElement.style.fontSize = "16px"; });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "right");
    await f.page.setViewportSize({ width: 390, height: 900 });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "bottom");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a presentation change cancels a held drag instead of rotating or committing it", async () => {
  const f = await fixture();
  try {
    const pane = f.page.getByRole("dialog");
    const header = (await pane.locator(".workspace-header").boundingBox())!;
    const x = header.x + 100, y = header.y + header.height - 5;
    await f.page.mouse.move(x, y); await f.page.mouse.down(); await f.page.mouse.move(x + 140, y);
    await f.page.evaluate(() => { document.querySelector<HTMLElement>("main")!.style.width = "390px"; });
    await f.page.waitForFunction(() => document.querySelector("[role=dialog]")?.getAttribute("data-edge") === "bottom");
    assert.equal(await pane.evaluate(element => new DOMMatrix(getComputedStyle(element).transform).m42), 0);
    await f.page.mouse.up();
    assert.equal(await pane.isVisible(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
