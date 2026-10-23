import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import SelectionField from '@desert/svelte/catalog/foundations/selection-field/SelectionField.svelte';
  import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
  let value=$state('first');
</script>
<main style="padding:24px">
  <SelectionField selection="choice" label="Single choice" {value} onchange={next=>value=next}
    options={[{value:'first',label:'First option'},{value:'second',label:'Second option'},
      {value:'disabled',label:'Unavailable option',disabled:true}]} />
  <DateControl node={{version:'desert.control/1',kind:'date',id:'date',label:'Arrival date',required:false,
    disabled:false,value:'2026-10-16'}} onevent={()=>{}} />
</main>`;
const evidence = new URL('../artifacts/picker-composition/', import.meta.url);
const settle = async (element: HTMLElement) => { await Promise.all(element.getAnimations().map(a=>a.finished)); };

for (const colorScheme of ['light','dark'] as const) test(`picker hierarchy and shape in ${colorScheme}`, async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:390,height:844});
    await f.page.emulateMedia({colorScheme});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.getByRole('button',{name:/Single choice/}).click();
    const sheet=f.page.locator('[data-picker-sheet]'); await sheet.waitFor(); await sheet.evaluate(settle);
    await f.page.keyboard.press('ArrowDown');
    const shape=await sheet.evaluate(element=>{
      const content=element.querySelector('[data-picker-content]')!;
      const title=element.querySelector('.toolbar-title')!;
      const option=element.querySelector('[role="option"]')!;
      const clip=content.getBoundingClientRect(), row=option.getBoundingClientRect();
      return {title:parseFloat(getComputedStyle(title).fontSize),option:parseFloat(getComputedStyle(option).fontSize),
        focusInset:row.top-clip.top,markers:element.querySelectorAll('[data-selection-mark="single"]').length};
    });
    await mkdir(evidence,{recursive:true});
    await f.page.screenshot({path:new URL(`select-${colorScheme}.png`,evidence).pathname});
    assert.ok(shape.title>shape.option,'picker title has a stronger type role than option text');
    assert.ok(shape.focusInset>=6,'scroll boundary reserves the whole focus outline');
    assert.equal(shape.markers,3,'every single-choice option has a radio mark, including disabled and unselected');
    assert.equal(await f.page.getByRole('option',{selected:true}).innerText(),'First option','moving focus does not commit');
    await f.page.keyboard.press('Escape'); await sheet.waitFor({state:'hidden'});
    await f.page.setViewportSize({width:320,height:844});
    await f.page.getByRole('button',{name:/Arrival date/}).click();await sheet.waitFor();await sheet.evaluate(settle);
    const calendar=f.page.getByRole('application');
    const pane=(await sheet.boundingBox())!, grid=(await calendar.boundingBox())!;
    assert.ok(grid.width>=pane.width*.8,'calendar uses the readable width of its pane');
    assert.equal(await calendar.getByRole('columnheader').count(),7);
    await f.page.screenshot({path:new URL(`date-${colorScheme}.png`,evidence).pathname});
    await f.page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
    await f.page.setViewportSize({width:1200,height:844});
    await f.page.evaluate(()=>document.documentElement.style.fontSize='48px');
    await f.page.getByRole('button',{name:/Arrival date/}).click();await sheet.waitFor();await sheet.evaluate(settle);
    const large=(await sheet.boundingBox())!;
    assert.ok(large.width<=24*48,'sheet width is bounded by its readable content budget');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('a 480px surface keeps pickers anchored; larger text can exhaust the same budget',async()=>{
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:480,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    for(const name of [/Single choice/,/Arrival date/]) {
      await f.page.getByRole('button',{name}).click();await f.page.getByRole('dialog').or(f.page.getByRole('listbox')).first().waitFor();
      assert.equal(await f.page.locator('[data-picker-sheet]').count(),0,'480px retains surrounding context');
      await f.page.keyboard.press('Escape');
    }
    for (const rem of [16,20]) for (const width of [24*rem-1,24*rem]) {
      await f.page.evaluate(rem=>document.documentElement.style.fontSize=`${rem}px`,rem);
      await f.page.setViewportSize({width,height:900});
      await f.page.getByRole('button',{name:/Arrival date/}).click();
      await f.page.getByRole('application').waitFor();
      assert.equal(await f.page.locator('[data-picker-sheet]').count(),width<24*rem?1:0,
        `Calendar needs 20rem content plus 4rem context at ${width}px / ${rem}px text`);
      await f.page.keyboard.press('Escape');
      await f.page.getByRole('application').waitFor({state:'hidden'});
      assert.equal(await f.page.getByRole('button',{name:/Arrival date/}).evaluate(element=>element===document.activeElement),true);
    }
  } finally {await f.close();}
});

test('enlarged picker text reflows; only the two-dimensional calendar grid scrolls horizontally',async()=>{
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:320,height:800});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({colorScheme:'dark'});
    await f.page.evaluate(()=>document.documentElement.style.fontSize='32px');
    await f.page.getByRole('button',{name:/Single choice/}).click();
    const sheet=f.page.locator('[data-picker-sheet]');await sheet.waitFor();await sheet.evaluate(settle);
    assert.ok(await sheet.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'sheet itself does not overflow');
    await f.page.screenshot({path:new URL('select-320-text200.png',evidence).pathname});
    await f.page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
    await f.page.getByRole('button',{name:/Arrival date/}).click();await sheet.waitFor();await sheet.evaluate(settle);
    await f.page.keyboard.press('End');
    const geometry=await sheet.evaluate(el=>{
      const viewport=el.querySelector('[data-calendar-grid-viewport]')!.getBoundingClientRect();
      const focus=document.activeElement!.getBoundingClientRect();
      return {contained:el.scrollWidth<=el.clientWidth+1,visible:focus.left>=viewport.left-1&&focus.right<=viewport.right+1};
    });
    assert.ok(geometry.contained && geometry.visible,'keyboard reveals the focused day inside its local grid');
    await f.page.screenshot({path:new URL('date-320-text200.png',evidence).pathname});
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
