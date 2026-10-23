import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { workspaceCss as styles } from "./fixtures/workspace-css.ts";
import { workspaceNavigation } from "../src/svelte/explorer/workspace-navigation.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";
import { settle } from "./web/public-catalog-expectations.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from "@desert/svelte/explorer/CatalogWorkspace.svelte";
  let active=$state('notes'), events=$state([]), panelOpen=$state(false);
  ${workspaceBodySource(Array.from({length:80},(_,index)=>({kind:'text',text:`Writing line ${index}`})))}
  const panel={owner:owners.panel,label:'Panel fixture',locked:false,frame:{version:'desert.surface-frame/6',kind:'message',
    top:{title:'Panel fixture'},content:{kind:'message',text:'A real panel in the shared host.'},bottom:{}}};
</script>
<CatalogWorkspace navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes" identity={{title:'Notes',subtitle:'Your writing.'}}
  navigation={[{id:'home',label:'Home',icon:'open'},{id:'notes',label:'Notes',icon:'create'},
    {id:'visual',label:'Visual catalog',icon:'catalog'}]} {active}
  searching={false} query="" onquery={()=>{}} onsearch={()=>{}} oncancel={()=>{}}
  searchAvailable={false} onnavigate={id=>{active=id;events=[...events,id]}}
  topActions={[{intent:{kind:'view.output',view:'notes.home',output:'create'},label:'New note',icon:'create',state:'ready'}]}
  invoke={intent=>{events=[...events,intent];panelOpen=true;}} content={workspaceBody}
  panelState={{panel:panelOpen?panel:null,error:null,uncertain:false,dismissError:()=>{},onevent:()=>{panelOpen=false;}}} />
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
    await f.page.getByRole('button',{name:'New note',exact:true}).click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent()??'[]'),
      [{kind:'view.output',view:'notes.home',output:'create'}]);
    const panel=f.page.getByRole('dialog',{name:'Panel fixture',exact:true});
    await panel.waitFor();
    const hostBounds=await f.page.locator('[data-adaptive-host]').evaluate(element=>{
      const rect=element.getBoundingClientRect();
      return {left:rect.left+(Number.parseFloat(getComputedStyle(element).getPropertyValue('--place-leading-inset'))||0),
        top:rect.top,right:document.documentElement.clientWidth-rect.right,bottom:innerHeight-rect.bottom};
    });
    const panelBounds=await panel.evaluate(element=>Object.fromEntries(['left','top','right','bottom'].map(edge=>
      [edge,Number.parseFloat((element as HTMLElement).style.getPropertyValue('--adaptive-'+edge))])));
    assert.deepEqual(panelBounds,hostBounds,'portalled panels retain the measured host bounds');
    assert.equal(await panel.evaluate(element=>element.closest('[data-catalog-scroll]')!==null),false,
      'panels never nest inside scrolling content');
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

test("declared actions and search share the trailing top dock at narrow and wide widths", { timeout: 20000 }, async()=>{
  const f=await svelteBrowser(source.replace('searchAvailable={false}','searchAvailable={true}'));
  try {
    await f.page.setViewportSize({width:390,height:844});
    await f.page.addStyleTag({content:await styles()});
    const action=f.page.getByRole('button',{name:'New note',exact:true});
    const search=f.page.getByRole('button',{name:'Search',exact:true});
    await action.waitFor();
    await settle(f.page);
    const compactAction=await action.boundingBox(), compactSearch=await search.boundingBox();
    assert.ok(compactAction && compactAction.y<100,'topDock action must not migrate to the compact bottom search rail');
    assert.ok(compactSearch && compactSearch.y<100,'search uses the same approved top placement at every width');
    assert.ok(Math.abs(compactAction.y-compactSearch.y)<=4,'actions and search share a rail');
    assert.ok(compactSearch.x>compactAction.x,'search remains the final trailing action');
    const navigation=await f.page.getByRole('button',{name:'Show navigation',exact:true}).boundingBox();
    assert.ok(navigation && navigation.x<60 && navigation.y>700,`navigation return stays at the main surface bottom-left: ${JSON.stringify(navigation)}`);
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
