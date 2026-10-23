import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
// The approved toolbar moves commands right and uses a labeled speed dial.
// Compare current canonical consumers, not pixels from the superseded design.
const source=`<script lang="ts">
  import Toolbar from '@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte';
  import ToolbarLayout from '@desert/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte';
  import Viewer from '@desert/svelte/catalog/compositions/viewer/Viewer.svelte';
  let open=$state(false),index=$state(0);
  const items=[{kind:'image',source:'/media/coast',alt:'Coast'},{kind:'image',source:'/media/peak',alt:'Peak'}];
  const leading={intent:{kind:'back'},label:'Back',icon:'back',state:'ready'};
  const trailing=Array.from({length:32},(_,i)=>({intent:{kind:'journey',journey:'operation'+i},label:'Operation '+i,icon:'edit',state:'ready'}));
  const top={edge:'top',title:'A shared title',subtitle:'The same geometry and controls',leading,trailing};
  const bottom={edge:'bottom',secondary:{intent:{kind:'close'},label:'Cancel',icon:'close',state:'ready'},
    primary:{intent:{kind:'journey',journey:'save'},label:'Save',icon:'save',state:'ready'}};
</script>
<main data-renderer-profile="apple-reference">
  <section data-consumer="facade"><Toolbar toolbar={top} invoke={()=>{}}/><Toolbar toolbar={bottom} invoke={()=>{}}/></section>
  <section data-consumer="owner"><ToolbarLayout content={{kind:'commands',toolbar:top,invoke:()=>{}}}/><ToolbarLayout content={{kind:'commands',toolbar:bottom,invoke:()=>{}}}/></section>
  <button onclick={()=>open=true}>Open viewer</button>
  <Viewer {items} title="Media" {index} {open} onindex={value=>index=value} onopen={value=>open=value} onreturn={()=>{}}/>
</main>`;

for(const width of [390,1280])test(`approved toolbar geometry and canonical consumer parity at ${width}px`,async()=>{
    const fixture=await svelteBrowser(source,{},"http://toolbar-closure.test/");
    try{
      const {page}=fixture;
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({colorScheme:"dark",reducedMotion:"reduce"});
      await page.route('**/media/**',route=>route.fulfill({contentType:'image/svg+xml',body:
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#69867a"/></svg>'}));
      await page.addStyleTag({content:await rendererCss()});
      const settled=()=>page.evaluate(async()=>{
        await document.fonts.ready;
        await Promise.all([...document.images].filter(image=>image.checkVisibility()).map(image=>image.decode().catch(()=>{})));
        await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
      });
      await settled();
      const facade=page.locator('[data-consumer="facade"]'),owner=page.locator('[data-consumer="owner"]');
      const geometry=await facade.locator('[data-toolbar="top"]').evaluate(element=>{
        const row=element.querySelector('.toolbar-row')!.getBoundingClientRect();
        const back=element.querySelector('[data-toolbar-navigation]')!.getBoundingClientRect();
        const utilities=element.querySelector('[data-toolbar-utilities]')!.getBoundingClientRect();
        const title=element.querySelector('.toolbar-title')!.getBoundingClientRect();
        const subtitle=element.querySelector('.toolbar-subtitle')!.getBoundingClientRect();
        return {left:back.left-row.left,right:row.right-utilities.right,ordered:utilities.left>=back.right,
          visible:element.querySelectorAll('[data-toolbar-utilities] > [data-toolbar-command]').length,gap:subtitle.top-title.bottom};
      });
      assert.ok(Math.abs(geometry.left)<1,'Back stays on the leading edge');
      assert.ok(Math.abs(geometry.right)<1,'contextual commands align to the trailing edge');
      assert.equal(geometry.ordered,true);
      assert.ok(geometry.gap>=0 && geometry.gap<=4,'title and subtitle remain tightly grouped');
      assert.ok(geometry.visible<32,'only capacity-fitting commands remain visible');
      if(width===1280)assert.ok(geometry.visible>0,'wide toolbars do not collapse every command');
      const facadePixels=await facade.screenshot({animations:'disabled'}),ownerPixels=await owner.screenshot({animations:'disabled'});
      assert.equal(facadePixels.equals(ownerPixels),true,'Toolbar facade renders the exact current ToolbarLayout geometry');
      for(const label of ['Cancel','Save']) {
        const button=facade.getByRole('button',{name:label,exact:true});
        assert.equal(await button.innerText(),label);assert.equal(await button.locator('svg:visible').count(),0,'text actions never compete with a visible icon');
      }
      const more=facade.getByRole('button',{name:'More actions',exact:true});await more.click();await settled();
      const dial=page.getByRole('dialog',{name:'More actions',exact:true});
      assert.equal(await dial.locator('[data-speed-dial-label]').count(),32-geometry.visible,'the dial includes precisely overflowing commands');
      await page.keyboard.press('Escape');
      assert.equal(await more.evaluate(element=>element===document.activeElement),true,'Escape restores the overflow trigger');
      await page.getByRole('button',{name:'Open viewer',exact:true}).click();
      await page.locator('[data-media-viewer]').waitFor();await settled();
      assert.ok(await page.getByRole('button',{name:'Close media viewer',exact:true}).evaluate(element=>document.activeElement===element));
      await page.getByRole('button',{name:'Zoom in',exact:true}).click();await settled();
      assert.deepEqual(fixture.errors,[]);
    }finally{await fixture.close();}
});
