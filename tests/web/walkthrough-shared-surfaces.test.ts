import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "../fixtures/svelte-browser.ts";
import { rendererCss } from "../fixtures/renderer-css.ts";
import { settle } from "./public-catalog-expectations.ts";

test("contextual commands stay right and progressively overflow into the labeled speed dial", async () => {
  const f = await svelteBrowser(`<script>
    import ToolbarLayout from '@desert/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte';
    let feedback=$state('');
    const actions=['Create','Edit','View options','Archive','Inspect'].map((label,index)=>({label,icon:['create','edit','review','archive','settings'][index],state:'ready',intent:{kind:'journey',journey:label}}));
  </script>
  <ToolbarLayout identity={{title:'Notes'}} content={{kind:'place-navigation',detail:true,onback:()=>{},topActions:actions,invoke:intent=>feedback=intent.journey}} />
  <p role="status">{feedback}</p>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:1000,height:700}); await settle(f.page);
    assert.equal(await f.page.getByRole('button',{name:'More actions'}).count(),0);
    const back=await f.page.getByRole('button',{name:'Back',exact:true}).boundingBox();
    const create=await f.page.getByRole('button',{name:'Create',exact:true}).boundingBox();
    assert.ok(back && create && create.x > back.x + 200);
    await f.page.setViewportSize({width:320,height:568}); await settle(f.page);
    const more=f.page.getByRole('button',{name:'More actions',exact:true});
    await more.click();
    const dial=f.page.getByRole('dialog',{name:'More actions'});
    await dial.waitFor();
    assert.ok(await dial.locator('[data-speed-dial-label]').count()>0);
    await f.page.keyboard.press('Escape');
    assert.ok(await more.evaluate(node=>node===document.activeElement));
    await more.click();
    await dial.getByRole('button').last().focus();
    await f.page.keyboard.press('Tab');
    await dial.waitFor({state:'hidden'});
    assert.equal(await f.page.getByRole('status').innerText(),'','leaving the speed dial never invokes an action');
    await more.click(); await dial.getByRole('button',{name:'Inspect',exact:true}).click();
    assert.equal(await f.page.getByRole('status').innerText(),'Inspect');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

test("confirmation is a compact dialog and dispatches only an explicit accepted command", async () => {
  const f=await svelteBrowser(`<script>
    import ConfirmationDialog from '@desert/svelte/catalog/compositions/confirmation-dialog/ConfirmationDialog.svelte';
    import {surfaceFrame,SurfaceFrameVersion} from '@desert/interaction/surface-frame.ts';
    let open=$state(false),result=$state('none');
    const frame=surfaceFrame({version:SurfaceFrameVersion,kind:'confirmation',top:{title:'Move to Trash?'},content:{kind:'message',text:'You can restore this note.'},bottom:{secondary:{label:'Cancel',icon:'back',state:'ready',intent:{kind:'back'}},primary:{label:'Move to Trash',icon:'archive',state:'ready',intent:{kind:'accept'}}}});
  </script><button onclick={()=>open=true}>Archive</button><p role="status">{result}</p>
  <ConfirmationDialog {frame} {open} locked={false} invoke={intent=>{result=intent.kind;open=false;}} onclosed={()=>{}} />`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.getByRole('button',{name:'Archive',exact:true}).click();
    const dialog=f.page.getByRole('dialog'); await dialog.waitFor();
    assert.equal(await f.page.locator('[data-adaptive-surface]').count(),0);
    const rect=await dialog.boundingBox(); assert.ok(rect && rect.height < 450);
    assert.equal(await f.page.getByRole('status').innerText(),'none');
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await f.page.getByRole('status').innerText(),'back');
    await f.page.getByRole('button',{name:'Archive',exact:true}).click();
    await dialog.getByRole('button',{name:'Move to Trash',exact:true}).click();
    assert.equal(await f.page.getByRole('status').innerText(),'accept');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});

test('confirmation releases modality when a docked context replaces it or its owner closes', async () => {
  const f=await svelteBrowser(`<script>
    import ConfirmationDialog from '@desert/svelte/catalog/compositions/confirmation-dialog/ConfirmationDialog.svelte';
    import Drawer from '@desert/svelte/catalog/foundations/drawer/Drawer.svelte';
    import AdaptiveSurfaceLayout from '@desert/svelte/catalog/foundations/shell/AdaptiveSurfaceLayout.svelte';
    import {surfaceFrame,SurfaceFrameVersion} from '@desert/interaction/surface-frame.ts';
    let stage=$state('closed'), result=$state('none');
    const frame=surfaceFrame({version:SurfaceFrameVersion,kind:'confirmation',top:{title:'Move to Trash?'},content:{kind:'message',text:'You can restore this note.'},bottom:{secondary:{label:'Cancel',icon:'back',state:'ready',intent:{kind:'back'}},primary:{label:'Move to Trash',icon:'archive',state:'ready',intent:{kind:'accept'}}}});
    const context=surfaceFrame({version:SurfaceFrameVersion,kind:'context',top:{title:'Note',trailing:[{label:'Archive',icon:'archive',state:'ready',intent:{kind:'journey',journey:'trash'}}]},content:{kind:'message',text:'A note'},bottom:{secondary:{label:'Close',icon:'close',state:'ready',intent:{kind:'close'}}}});
  </script><AdaptiveSurfaceLayout><button onclick={()=>stage='context'}>Open note</button><button onclick={()=>result='opened'}>Trash</button><p role="status" aria-label="Result">{result}</p>
  {#if stage==='confirm'}<ConfirmationDialog {frame} open={true} locked={false} invoke={intent=>{stage=intent.kind==='back'?'context':'closed';result=intent.kind;}} onclosed={()=>{}} />
  {:else if stage==='context'}<Drawer label="Note" frame={context} open={true} invoke={()=>stage='confirm'} onclose={()=>stage='closed'}/>{/if}</AdaptiveSurfaceLayout>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:1600,height:1000});
    await f.page.getByRole('button',{name:'Open note',exact:true}).click();
    for(const action of ['Cancel','Move to Trash']) {
      await f.page.locator('[data-adaptive-surface][data-presentation="docked"]').waitFor();
      await f.page.getByRole('button',{name:'Archive',exact:true}).click();
      await f.page.getByRole('dialog').getByRole('button',{name:action,exact:true}).click();
      await f.page.getByRole('dialog').waitFor({state:'detached'});
      await f.page.getByRole('button',{name:'Trash',exact:true}).click();
      assert.equal(await f.page.getByRole('status',{name:'Result'}).innerText(),'opened');
      assert.notEqual(await f.page.evaluate(()=>getComputedStyle(document.body).pointerEvents),'none');
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test("visual bank index opens actual owners inside titled stacks and returns keyboard focus", async () => {
  const f=await svelteBrowser(`<script>
    import SharedOwnerCatalog from '@desert/svelte/catalog/compositions/shared-owner-catalog/SharedOwnerCatalog.svelte';
  </script><SharedOwnerCatalog onchange={()=>{}} />`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:390,height:844}); await settle(f.page);
    const row=f.page.getByRole('button',{name:'Information',exact:true});
    await row.click();
    assert.equal(await f.page.locator('[data-owner-specimen="Information"]').count(),1);
    assert.equal(await f.page.locator('[data-owner-specimen="Information"] .bank-stack').count(),1);
    assert.equal(await f.page.locator('[data-owner-specimen="Information"]').evaluate(node=>node.scrollWidth<=node.clientWidth),true);
    await f.page.getByRole('button',{name:'Back',exact:true}).click();
    assert.equal(await row.evaluate(node=>node===document.activeElement),true);
    await f.page.getByRole('button',{name:'Attention Indicator',exact:true}).click();
    const indicator=f.page.locator('[data-attention-indicator]');
    await f.page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await indicator.evaluate(node=>getComputedStyle(node).animationName),'none');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
