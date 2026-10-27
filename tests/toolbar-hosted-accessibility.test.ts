import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { workspaceBodySource } from './fixtures/workspace-body.ts';

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource([
    {kind:'visual-catalog',id:'bank'},
    {kind:'media-library',id:'library',library:{id:'photos',
      items:[{id:'coast',kind:'image',title:'Coast',image:{asset:'coast',alt:'A coast'}}],
      albums:[{id:'trip',title:'Trip',cover:'coast',items:['coast']}],featured:['trip']}},
  ])}
</script>
<CatalogWorkspace navigationSurface={{title:'VOID',settingsPlaceholder:true}}
  title="Visual catalog" identity={{title:'Visual catalog',subtitle:'Hosted typography.'}}
  navigation={[{id:'catalog',label:'Visual catalog',icon:'catalog',group:'Developer'}]} active="catalog"
  searching={false} query="" onquery={()=>{}} onsearch={()=>{}} oncancel={()=>{}} onnavigate={()=>{}}
  content={workspaceBody} />`;

for(const direction of ['ltr','rtl']) test(`hosted calendar, transient, problem and viewer retain enlarged workspace targets ${direction}`,async()=>{
  const f=await svelteBrowser(source,{},'http://toolbar.test/');
  try{
    await f.page.setViewportSize({width:1280,height:900});
    await f.page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
    await f.page.route('**/media/**',route=>route.fulfill({contentType:'image/svg+xml',body:
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#69757a"/></svg>'}));
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(direction=>{document.documentElement.dir=direction;document.documentElement.style.setProperty('--text-scale','2');},direction);
    await f.page.locator('[data-slot="sidebar-wrapper"].density-comfortable').waitFor();
    const target=(await f.page.getByRole('button',{name:'Search',exact:true}).boundingBox())!.height;
    assert.equal(target,60);
    await mkdir('artifacts/toolbar-canonical-geometry/hosted-accessibility',{recursive:true});
    for(const[name,entry,state,opener,selector]of[
      ['calendar','control.date','calendar','[data-view-item="specimen:control.date:calendar"] button','[data-date-calendar-header]'],
      ['transient','transient','open','[data-view-item="specimen:transient:open"] button','[data-surface-frame] [data-piece="toolbar"]'],
      // The problem is a dialog now (DESIGN §7.5): its choices are the rail it hosts.
      ['problem','problem','error','[data-view-item="specimen:problem:error"] button','[data-modal-message-actions]'],
      ['viewer',null,null,'internal:role=button[name="Coast"s]','[data-media-viewer] [data-piece="toolbar"]'],
    ]){
      if(entry) {
        await f.page.locator(`[data-view-item="catalog-index"] [data-focus-key="${entry}"]`).click();
        await f.page.locator(`[data-view-item="entry:${entry}"]`).getByRole('button',{name:/^State ·/}).click();
        await f.page.getByRole('option',{name:state!,exact:true}).click();
      }
      await f.page.locator(opener!).click();
      const bars=f.page.locator(selector!);await bars.first().waitFor();
      const measurements=await bars.evaluateAll(nodes=>nodes.map(node=>{
        const box=node.getBoundingClientRect(),row=node.querySelector('.toolbar-row,[data-date-calendar-row]') ?? node;
        return{density:node.closest('.density-comfortable,.density-compact')?.classList.contains('density-comfortable')?'comfortable':node.closest('.density-compact')?'compact':undefined,
          width:node.clientWidth,scroll:node.scrollWidth,left:box.left,right:box.right,
          buttons:[...row.querySelectorAll<HTMLElement>('button:not([data-media-thumbs] button)')].map(button=>button.getBoundingClientRect().toJSON())};
      }));
      for(const bar of measurements){
        assert.equal(bar.density,'comfortable',`${name} keeps the launch workspace typography after portal`);
        assert.ok(bar.scroll<=bar.width+1,`${name} does not overflow`);
        for(const button of bar.buttons){
          // A toolbar sizes its targets to the workspace's; a dialog's text choices grow with that typography at least as far.
          if(name==='problem') assert.ok(button.height>=target,`${name} keeps at least the real workspace target`);
          else assert.equal(button.height,target,`${name} shares the real workspace target`);
          assert.ok(button.left>=bar.left&&button.right<=bar.right,`${name} keeps controls inside its rail`);
        }
      }
      await f.page.screenshot({path:`artifacts/toolbar-canonical-geometry/hosted-accessibility/${direction}-${name}.png`});
      await f.page.keyboard.press('Escape');await bars.first().waitFor({state:'hidden'});
      if(entry) await f.page.getByRole('button',{name:'Back',exact:true}).click();
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('hosted target witness detects a portal that loses its launch typography',async()=>{
  // The message dialog's portal takes the launch density from the modal that hosts it.
  const path=resolve('src/svelte/catalog/foundations/modal/ModalDialog.svelte');
  const original=await readFile(path,'utf8');
  assert.equal(original.split('class={[density, "focus-inset"]}').length,2,'the modal applies the launch density once');
  const broken=original.replace('class={[density, "focus-inset"]}','class="focus-inset"');
  const f=await svelteBrowser(source,{[path]:broken},'http://toolbar.test/');
  try{
    await f.page.setViewportSize({width:1280,height:900});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(()=>document.documentElement.style.setProperty('--text-scale','2'));
    await f.page.locator('[data-slot="sidebar-wrapper"].density-comfortable').waitFor();
    const workspace=(await f.page.getByRole('button',{name:'Search',exact:true}).boundingBox())!.height;
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="problem"]').click();
    await f.page.locator('[data-view-item="entry:problem"]').getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'error',exact:true}).click();
    await f.page.locator('[data-view-item="specimen:problem:error"] button').click();
    const close=f.page.locator('[data-modal-message-actions] button');await close.waitFor();
    assert.equal(workspace,60);
    assert.equal(await close.evaluate(node=>node.closest('.density-comfortable')),null,'the broken portal lost the launch density');
    // A dialog's text choice is sized by its type: the broken portal draws it in the smaller viewport control type.
    const [portalled,launch]=await close.evaluate(node=>{
      const probe=document.createElement('span');probe.style.fontSize='var(--text-control)';
      document.querySelector('[data-slot="sidebar-wrapper"].density-comfortable')!.append(probe);
      const sizes=[parseFloat(getComputedStyle(node).fontSize),parseFloat(getComputedStyle(probe).fontSize)];probe.remove();return sizes;
    });
    assert.ok(portalled!<launch!,`the broken portal falls back to the smaller viewport type context: ${portalled} < ${launch}`);
    assert.notEqual(portalled,workspace,'the hosted regression is observable instead of being normalized away');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
