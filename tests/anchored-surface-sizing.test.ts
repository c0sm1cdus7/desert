import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const css = rendererCss();
async function fixture(text: string) {
  const f = await svelteBrowser(`<script lang="ts">
    import AnchoredSurface from "@desert/svelte/pieces/AnchoredSurface.svelte";
    let open = $state(false), clicks = $state(0);
  </script>
  <main style="width:100%;height:100dvh;display:flex;align-items:center;justify-content:center">
    <AnchoredSurface label="Open details" title="Details" content={{kind:'information',items:[{kind:'text',text:${JSON.stringify(text)}}]}}
      {open} onchange={value => open = value} />
    <button style="position:absolute;left:12px;top:12px" onclick={()=>clicks+=1}>Outside</button>
    <output data-clicks>{clicks}</output>
  </main>`);
  await f.page.addStyleTag({ content: await css });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  return f;
}

for (const width of [900,390]) test(`nonmodal contextual popover stays anchored, bounded, chrome-free at ${width}px`, async () => {
  const f = await fixture("A short contextual explanation.");
  try {
    await f.page.setViewportSize({width,height:450});
    const trigger=f.page.getByRole("button",{name:"Open details",exact:true});
    await trigger.click(); const popup=f.page.getByRole("dialog",{name:"Details",exact:true});
    await popup.waitFor();
    assert.equal(await popup.getAttribute("aria-modal"),"false");
    assert.equal(await f.page.locator('.scrim,.drawer-grip,[data-surface-slot]').count(),0);
    const anchor=(await trigger.boundingBox())!, box=(await popup.boundingBox())!;
    assert.ok(box.x>=11 && box.x+box.width<=width-11,JSON.stringify(box));
    assert.ok(box.y>=11 && box.y+box.height<=439,JSON.stringify(box));
    assert.ok(Math.min(Math.abs(box.y-(anchor.y+anchor.height)),Math.abs(anchor.y-(box.y+box.height)))<=9,"adjacent to anchor");
    await f.page.keyboard.press("Escape"); await popup.waitFor({state:"hidden"});
    assert.equal(await trigger.evaluate(node=>document.activeElement===node),true);
    await trigger.click();
    await f.page.getByRole("button",{name:"Outside",exact:true}).click();
    await popup.waitFor({state:"hidden"});
    assert.equal(await f.page.locator('[data-clicks]').innerText(),'1');
    assert.equal(await f.page.getByRole("button",{name:"Outside",exact:true}).evaluate(node=>document.activeElement===node),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("long contextual content scrolls inside its anchored collision budget without synthetic toolbars",async()=>{
  const f=await fixture("A long but finite contextual explanation. ".repeat(100));
  try {
    await f.page.setViewportSize({width:900,height:450});
    await f.page.getByRole("button",{name:"Open details",exact:true}).click();
    const popup=f.page.getByRole("dialog",{name:"Details",exact:true}); await popup.waitFor();
    const geometry=await popup.evaluate(element=>{const box=element.getBoundingClientRect();return {
      top:box.top,bottom:box.bottom,height:box.height,scroll:element.scrollHeight,client:element.clientHeight};});
    assert.ok(geometry.top>=11 && geometry.bottom<=439,JSON.stringify(geometry));
    assert.ok(geometry.height>=44 && geometry.scroll>geometry.client,JSON.stringify(geometry));
    assert.equal(await popup.locator('button,[data-surface-slot]').count(),0);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("clicking and selecting nonfocusable contextual text does not dismiss its popover",async()=>{
  const f=await fixture("A contextual explanation remains available while people select and copy its text.");
  try {
    await f.page.setViewportSize({width:900,height:450});
    await f.page.getByRole('button',{name:'Open details',exact:true}).click();
    const panel=f.page.getByRole('dialog',{name:'Details',exact:true});await panel.waitFor();
    await f.page.waitForFunction(()=>document.activeElement?.getAttribute('data-slot')==='popover-content');
    const text=panel.locator('p');await text.click();
    assert.equal(await panel.isVisible(),true);
    await text.dblclick();
    assert.equal(await panel.isVisible(),true);
    assert.ok(await f.page.evaluate(()=>!!getSelection()?.toString().length));
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("keyboard-opened information dismisses when genuine autofocus leaves by Tab or ShiftTab",async()=>{
  const f=await fixture("Contextual information has no interior tab stops.");
  try {
    const trigger=f.page.getByRole('button',{name:'Open details',exact:true});
    const panel=f.page.getByRole('dialog',{name:'Details',exact:true});
    await trigger.click();await panel.waitFor();
    await f.page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
    for(const key of ['Tab','Shift+Tab']) {
      await trigger.press('Enter');await panel.waitFor();
      await f.page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='dialog');
      await f.page.keyboard.press(key);await panel.waitFor({state:'hidden'});
      assert.equal(await f.page.evaluate(()=>!!document.activeElement?.closest('[data-popover-content]')),false);
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
