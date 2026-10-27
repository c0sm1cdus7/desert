import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { settle } from './web/public-catalog-expectations.ts';

for(const reducedMotion of ['reduce','no-preference'] as const) test(`sidebar direct reveal owns its painted endpoint (${reducedMotion})`,async()=>{
 const f=await svelteBrowser(`<script lang="ts">
 import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
 import CatalogEdgeNavigation from '@desert/svelte/catalog/foundations/shell/CatalogEdgeNavigation.svelte';
 import ShellNavigation from '@desert/svelte/catalog/foundations/shell/ShellNavigation.svelte';
 let viewport=$state<HTMLElement|null>(null);
 </script>
 <div data-catalog-workspace><Sidebar.Provider>
 <Sidebar.Trigger />
 <ShellNavigation navigation={{identity:{title:'Product'},settingsPlaceholder:false,active:'home',groups:[]}} searching={false} onnavigate={()=>{}}/>
 <div bind:this={viewport} style="position:absolute;inset:0;pointer-events:none"></div><CatalogEdgeNavigation searching={false} detail={false} {viewport}/>
 </Sidebar.Provider></div>`,{},undefined,{initialCss:await rendererCss()});
 try{
  const{page}=f;await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion});await settle(page);
  const panel=page.locator('[data-sidebar="sidebar"][data-presentation="overlay"]');
  const painted=()=>panel.evaluate(e=>({x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,
   opacity:getComputedStyle(e).opacity,translate:getComputedStyle(e).translate,transition:getComputedStyle(e).transitionProperty,
   open:e.getAttribute('data-state'),gesture:e.hasAttribute('data-gesture-enter')}));
  await page.mouse.move(3,200);await page.mouse.down();await page.mouse.move(70,200,{steps:8});
  let state=await painted();assert.equal(state.opacity,'1');assert.equal(state.transition,'none');assert.ok(Math.abs(state.right-67)<1,'67px of pointer travel reveals67px, with no extra entrance offset');
  await page.mouse.move(200,200,{steps:8});await page.mouse.move(40,200,{steps:8});await page.mouse.up();await panel.waitFor({state:'hidden'});
  await page.mouse.move(3,200);await page.mouse.down();await page.mouse.move(220,200,{steps:8});await page.mouse.up();await settle(page);
  state=await painted();assert.equal(state.open,'open');assert.equal(state.opacity,'1');assert.equal(state.gesture,true);assert.ok(Math.abs(state.x-12)<1);
  await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
  await page.locator('[data-sidebar="trigger"]').click();await settle(page);
  state=await painted();assert.equal(state.gesture,false,'A later button entrance cannot inherit direct-manipulation state');
  if(reducedMotion==='reduce')assert.equal(state.transition,'none');
  else assert.match(state.transition,/translate/,'Ordinary entrance retains the shared motion properties');
  assert.equal(state.opacity,'1');assert.ok(Math.abs(state.x-12)<1);
  await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.deepEqual(f.errors,[]);
 }finally{await f.page.mouse.up().catch(()=>{});await f.close();}
});
