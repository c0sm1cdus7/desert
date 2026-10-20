import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "svelte/compiler";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceNavigation } from "../src/svelte/explorer/workspace-navigation.ts";

async function styles() {
  const filename=resolve(import.meta.dirname,'../src/svelte/explorer/CatalogWorkspace.svelte');
  // The isolated harness injects child styles after parent styles. The production
  // bundle places this unchanged shell-owner rule after AdaptiveSurfaceLayout.
  // Match that order, not an invented geometry override; built-app QA remains a gate.
  const owner=compile(await readFile(filename,'utf8'),{filename,generate:'client',css:'external'}).css?.code??'';
  return `${await rendererCss()}\n${owner}`;
}

const source = `<script lang="ts">
  import CatalogWorkspace from "@desert/svelte/explorer/CatalogWorkspace.svelte";
  let active=$state('notes'), events=$state([]);
</script>
<CatalogWorkspace productName="Notebook" title="Notes" identity={{title:'Notes',subtitle:'Your writing.'}}
  navigation={[{id:'home',label:'Home',icon:'open'},{id:'notes',label:'Notes',icon:'create'},
    {id:'visual',label:'Visual catalog',icon:'catalog'}]} {active}
  searching={false} query="" onquery={()=>{}} onsearch={()=>{}} oncancel={()=>{}}
  searchAvailable={false} onnavigate={id=>{active=id;events=[...events,id]}}
  topActions={[{intent:{kind:'view.output',view:'notes.home',output:'create'},label:'New note',icon:'create',state:'ready'}]}
  invoke={intent=>events=[...events,intent]}>
  {#snippet searchResults()}<p>No results</p>{/snippet}
  {#snippet panels()}<span hidden data-panel-host-witness></span>{/snippet}
  {#each Array(80) as _, index}<p>Writing line {index}</p>{/each}
</CatalogWorkspace>
<output hidden data-events>{JSON.stringify(events)}</output>`;

test("generic declarations retain the approved full-span shell, scroll and heading handoff", { timeout: 20000 }, async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:1440,height:900});
    await f.page.addStyleTag({content:await styles()});
    await f.page.getByRole('button',{name:'Notes',exact:true}).waitFor();
    assert.equal(await f.page.getByRole('button',{name:'Search',exact:true}).count(),0);
    assert.equal(await f.page.getByRole('button',{name:'Show navigation',exact:true}).count(),0);
    assert.equal(await f.page.locator('[data-place-toolbar] h2').count(),0, 'identity remains a scroll-driven echo, not a second page title');
    const viewport=f.page.locator('[data-catalog-scroll]');
    const geometry=await viewport.evaluate(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width,
      height:e.clientHeight,scrollHeight:e.scrollHeight,window:innerWidth}));
    assert.equal(geometry.left,0,'parent surface extends behind its docked sidebar');
    assert.equal(geometry.width,geometry.window,'sidebar must not shrink the parent viewport');
    assert.ok(geometry.scrollHeight>geometry.height,'long content remains in a bounded scroll owner');
    await viewport.evaluate(e=>e.scrollTop=500);
    await f.page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('[data-toolbar-identity]')!).opacity)>.9);
    assert.equal(await viewport.evaluate(e=>e.scrollTop),500);
    assert.match(await viewport.evaluate(e=>(e as HTMLElement).style.maskImage),/linear-gradient/);
    assert.equal(await f.page.locator('[data-adaptive-host-content] > [data-panel-host-witness]').count(),1,
      'panels consume the same measured host without nesting inside scrolling content');
    await f.page.getByRole('button',{name:'New note',exact:true}).click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent()??'[]'),
      [{kind:'view.output',view:'notes.home',output:'create'}]);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("generic navigation keeps the approved compact sidebar and dispatches its declared destination", { timeout: 20000 }, async()=>{
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:390,height:844});
    await f.page.addStyleTag({content:await styles()});
    await f.page.getByRole('button',{name:'Show navigation',exact:true}).click();
    const sheet=f.page.getByRole('dialog',{name:'Navigation',exact:true});
    await sheet.getByRole('button',{name:'Visual catalog',exact:true}).click();
    await sheet.waitFor({state:'hidden'});
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent()??'[]'),['visual']);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("declared top actions stay in the top dock while compact search remains below", { timeout: 20000 }, async()=>{
  const f=await svelteBrowser(source.replace('searchAvailable={false}','searchAvailable={true}'));
  try {
    await f.page.setViewportSize({width:390,height:844});
    await f.page.addStyleTag({content:await styles()});
    const action=f.page.getByRole('button',{name:'New note',exact:true});
    const search=f.page.getByRole('button',{name:'Search',exact:true});
    await action.waitFor();
    const compactAction=await action.boundingBox(), compactSearch=await search.boundingBox();
    assert.ok(compactAction && compactAction.y<100,'topDock action must not migrate to the compact bottom search rail');
    assert.ok(compactSearch && compactSearch.y>700,'search keeps its approved compact bottom placement');
    assert.equal(await action.evaluate(e=>e.closest('[data-place-toolbar]')!==null),true);
    assert.equal(compactAction.width,44); assert.equal(compactAction.height,44);
    await action.click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent()??'[]'),
      [{kind:'view.output',view:'notes.home',output:'create'}]);
    await f.page.setViewportSize({width:1440,height:900});
    await f.page.waitForFunction(()=>document.querySelector('[data-catalog-toolbar]')?.getAttribute('data-toolbar')==='top');
    assert.ok((await action.boundingBox())!.y<100,'topDock action remains above at wide width');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test("Landmarks defaults retain their exact groups and icon appearances",()=>{
  const groups=workspaceNavigation([{id:'browse',label:'Landmarks'},{id:'travel-kit',label:'Travel kit'},
    {id:'bank',label:'Component bank'}]);
  assert.deepEqual(groups,[
    {label:'Explore',items:[{id:'browse',label:'Landmarks',icon:'landmark',appearance:'browse'},
      {id:'travel-kit',label:'Travel kit',icon:'backpack',appearance:'travel-kit'}]},
    {label:'Developer',items:[{id:'bank',label:'Component bank',icon:'panels',appearance:'bank'}]},
  ]);
  assert.throws(()=>workspaceNavigation([{id:'undeclared',label:'Undeclared'}]),/WORKSPACE_NAVIGATION_ICON_REQUIRED/);
});
