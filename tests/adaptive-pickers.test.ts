import assert from "node:assert/strict";
import test from "node:test";
import { mkdir } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
  import SelectControl from '@desert/svelte/catalog/compositions/select-control/SelectControl.svelte';
  import { applyControlEvent } from '@desert/interaction/control-nodes.ts';
  let date = $state({version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival date',required:true,
    disabled:false,value:'2026-10-16',minimum:'2026-10-10',maximum:'2026-10-24'});
  let select = $state({version:'desert.control/1',kind:'select',id:'pace',label:'Travel pace',required:true,
    disabled:false,value:'slow',options:[{value:'slow',label:'Slow',disabled:false},
      {value:'disabled',label:'Unavailable',disabled:true},{value:'fast',label:'Fast',disabled:false}]});
  let edits = $state(0);
</script>
<main style="padding:20px;width:100%;max-width:600px">
  <DateControl node={date} onevent={event=>{date=applyControlEvent(date,event).node;edits++}} />
  <SelectControl node={select} onevent={event=>{select=applyControlEvent(select,event).node;edits++}} />
  <button onclick={()=>{date={...date,disabled:true};select={...select,disabled:true}}}>Disable pickers</button>
  <output>{date.value} / {select.value} / {edits}</output>
</main>`;

for (const {width,presentation,datePresentation} of [
  {width:1024,presentation:'anchored',datePresentation:'anchored'},
  {width:390,presentation:'sheet',datePresentation:'anchored'},
  {width:320,presentation:'sheet',datePresentation:'sheet'},
]) for (const colorScheme of ['light','dark'] as const)
test(`date and selection adapt at ${width}px in ${colorScheme} without changing commit semantics`, async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width,height:800});
    await f.page.emulateMedia({colorScheme});
    await f.page.addStyleTag({content:await rendererCss()});
    assert.equal(await f.page.getByRole('application').count(),0,'date calendar starts closed');
    const date=f.page.getByRole('button',{name:/Arrival date ·/});
    await date.click();
    const calendar=f.page.getByRole('application'); await calendar.waitFor();
    assert.equal(await calendar.evaluate(element=>getComputedStyle(element).backgroundColor),'rgba(0, 0, 0, 0)',
      'calendar uses its enclosing surface material rather than a square background');
    const calendarBox=(await calendar.boundingBox())!;
    assert.ok(calendarBox.x>=0 && calendarBox.x+calendarBox.width<=width,'calendar stays within the available inline space');
    if(datePresentation==='sheet') {
      const sheet=f.page.locator('[data-picker-sheet]');await sheet.waitFor();
      await sheet.evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished));});
      assert.equal(await sheet.getAttribute('data-edge'),'bottom');
      const box=(await sheet.boundingBox())!;
      assert.ok(box.y>40 && box.y+box.height<=800,'content-height sheet stays in the viewport');
      assert.equal(await sheet.getAttribute('aria-modal'),'true');
    } else {
      assert.equal(await f.page.locator('[data-picker-sheet]').count(),0);
      await f.page.locator('[data-slot="popover-content"]').evaluate(async element=>{
        await Promise.all(element.getAnimations().map(animation=>animation.finished));
      });
    }
    const evidence=new URL('../artifacts/picker-composition/regression/',import.meta.url);await mkdir(evidence,{recursive:true});
    await f.page.screenshot({path:new URL(`date-${width}-${colorScheme}.png`,evidence).pathname});
    assert.equal(await calendar.getByRole('button',{name:/October 9, 2026/}).getAttribute('aria-disabled'),'true');
    const day=calendar.getByRole('button',{name:/October 20, 2026/});
    await day.click();await calendar.waitFor({state:'hidden'});
    assert.match(await f.page.locator('output').innerText(),/2026-10-20 \/ slow \/ 1/);
    assert.equal(await date.evaluate(el=>el===document.activeElement),true,'selection restores trigger focus');
    await date.click();await f.page.keyboard.press('Escape');
    await calendar.waitFor({state:'hidden'});
    assert.equal(await date.evaluate(el=>el===document.activeElement),true);
    const selection=f.page.getByRole('button',{name:'Travel pace · Slow',exact:true});
    await selection.click();const list=f.page.getByRole('listbox');await list.waitFor();
    assert.equal(await list.getByRole('option',{name:'Unavailable',exact:true}).getAttribute('aria-disabled'),'true');
    await f.page.keyboard.press('End');
    assert.match(await f.page.locator('output').innerText(),/slow \/ 1/,'highlighting does not commit');
    await f.page.keyboard.press('Enter');await list.waitFor({state:'hidden'});
    assert.match(await f.page.locator('output').innerText(),/fast \/ 2/);
    const selected=f.page.getByRole('button',{name:'Travel pace · Fast',exact:true});
    await selected.click();await list.waitFor();
    if(presentation==='sheet') await f.page.waitForFunction(() => document.activeElement?.getAttribute('data-picker-sheet') !== null
      && document.activeElement?.getAttribute('role') === 'dialog');
    await f.page.keyboard.press('s');
    assert.match(await f.page.locator('output').innerText(),/fast \/ 2/,'typeahead does not commit');
    await f.page.keyboard.press('Escape');await list.waitFor({state:'hidden'});
    assert.equal(await selected.evaluate(el=>el===document.activeElement),true);
    await selected.click();await list.waitFor();
    await f.page.locator(presentation==='sheet'?'[data-picker-sheet]':'[data-slot="popover-content"]').evaluate(async element=>{
      await Promise.all(element.getAnimations().map(animation=>animation.finished));
    });
    await f.page.screenshot({path:new URL(`select-${width}-${colorScheme}.png`,evidence).pathname});
    await list.getByRole('option',{name:'Slow',exact:true}).click();await list.waitFor({state:'hidden'});
    assert.match(await f.page.locator('output').innerText(),/slow \/ 3/);
    await f.page.getByRole('button',{name:'Disable pickers'}).click();
    assert.equal(await date.isDisabled(),true);
    assert.equal(await f.page.getByRole('button',{name:'Travel pace · Slow',exact:true}).isDisabled(),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('picker presentation follows available content-and-context space, including text scale', async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:480,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    const date=f.page.getByRole('button',{name:/Arrival date ·/});
    await date.click();await f.page.getByRole('application').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),0,'480px fits readable anchored content and visible context');
    await f.page.keyboard.press('Escape');await f.page.getByRole('application').waitFor({state:'hidden'});
    await f.page.evaluate(()=>{document.documentElement.style.fontSize='21px';});
    await date.click();await f.page.locator('[data-picker-sheet]').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').getAttribute('data-edge'),'bottom','larger text exhausts the same space budget');
    await f.page.keyboard.press('Escape');await f.page.getByRole('application').waitFor({state:'hidden'});
    await f.page.getByRole('button',{name:'Travel pace · Slow',exact:true}).click();
    await f.page.locator('[data-picker-sheet]').waitFor();
    assert.equal(await f.page.getByRole('listbox').count(),1,'both controls exhaust their content-and-context budget at enlarged text');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('a narrow owning surface uses picker sheets even inside a wide window', async () => {
  const embedded=source.replace('import DateControl', `import { provideSurfaceHost } from '@desert/svelte/infra/surface-host.svelte.ts';
  import DateControl`).replace('let edits = $state(0);', `let edits = $state(0);
  let host=$state<HTMLElement|null>(null);provideSurfaceHost(()=>host);`)
    .replace('<main style="padding:20px;width:100%;max-width:600px">','<main bind:this={host} style="padding:20px;width:390px">');
  const f=await svelteBrowser(embedded);
  try {
    await f.page.setViewportSize({width:1200,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.getByRole('button',{name:/Arrival date ·/}).click();
    await f.page.getByRole('application').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),1,'owning surface supplies the available layout space');
    await f.page.keyboard.press('Escape');await f.page.getByRole('application').waitFor({state:'hidden'});
    await f.page.getByRole('button',{name:'Travel pace · Slow',exact:true}).click();
    await f.page.getByRole('listbox').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),1);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
