import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const ordinary = `<script lang="ts">
  import Drawer from '@desert/svelte/pieces/Drawer.svelte';
  import { surfaceFrame } from '@desert/interaction/surface-frame.ts';
  import { toolbarAction } from '@desert/interaction/toolbar.ts';
  let open=$state(false),observed=$state('');
  const frame=surfaceFrame({version:'desert.surface-frame/6',kind:'journey',
    top:{title:'Edit task',subtitle:'Describe the work and choose its projects.'},
    content:{kind:'form',submit:'save-task',fields:[{name:'title',label:'Title',value:'Research',required:true,primitive:'input.text'}]},
    bottom:{primary:toolbarAction({kind:'journey',journey:'save-task'},'Save task','save')}});
</script><button onclick={()=>open=true}>Open editor</button><output>{observed}</output>
<Drawer label="Edit task" {open} {frame} onclose={()=>open=false} invoke={intent=>observed=JSON.stringify(intent)}/>`;

test('ordinary transient saves through a primary top check, has no footer and no rectangular boundary ring', {timeout:180000}, async()=>{
  const f=await svelteBrowser(ordinary);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [390,1280]) {
      await f.page.setViewportSize({width,height:900});
      await f.page.getByRole('button',{name:'Open editor',exact:true}).click();
      const dialog=f.page.getByRole('dialog',{name:'Edit task',exact:true});
      await dialog.waitFor();
      assert.equal(await dialog.locator('[data-surface-slot="bottom"]').count(),0);
      const save=dialog.locator('[data-toolbar="top"]').getByRole('button',{name:'Save task',exact:true});
      assert.equal(await save.getAttribute('data-emphasis'),'primary');
      assert.equal(await save.locator('.lucide-check').count(),1);
      const bounds=await save.boundingBox(); assert.ok(bounds && Math.abs(bounds.width-bounds.height)<1);
      const closeBounds=await dialog.getByRole('button',{name:'Close',exact:true}).boundingBox();
      assert.ok(closeBounds && bounds.x>closeBounds.x && Math.abs(bounds.y-closeBounds.y)<1,JSON.stringify({bounds,closeBounds}));
      await dialog.locator('[data-surface-frame]').focus();
      assert.equal(await dialog.locator('[data-surface-frame]').evaluate(element=>getComputedStyle(element).outlineStyle),'none');
      await f.page.keyboard.press('Tab');
      assert.ok(await dialog.evaluate(element=>element.contains(document.activeElement)));
      assert.notEqual(await f.page.evaluate(()=>getComputedStyle(document.activeElement!).outlineStyle),'none','real keyboard targets retain their focus indication');
      await save.click();
      assert.deepEqual(JSON.parse(await f.page.locator('output').innerText()),{kind:'journey',journey:'save-task'});
      await dialog.getByRole('button',{name:'Close',exact:true}).click();
      await dialog.waitFor({state:'hidden'});
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('an explicit create action group opens one + with separate object creation actions',{timeout:180000},async()=>{
  const f=await svelteBrowser(`<script lang="ts">
    import Toolbar from '@desert/svelte/pieces/Toolbar.svelte';
    import {toolbarAction} from '@desert/interaction/toolbar.ts';
    let observed=$state('');
  </script><Toolbar toolbar={{edge:'top',title:'Tasks',actionGroup:'create',trailing:[
    toolbarAction({kind:'journey',journey:'create-task'},'Create task','confirm'),
    toolbarAction({kind:'journey',journey:'create-project'},'Create project','catalog')
  ]}} invoke={intent=>observed=JSON.stringify(intent)}/><output>{observed}</output>`);
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.setViewportSize({width:390,height:900});
    assert.equal(await f.page.getByRole('button',{name:'Create task',exact:true}).count(),0);
    await f.page.getByRole('button',{name:'Create',exact:true}).click();
    assert.equal(await f.page.getByRole('button',{name:'Create task',exact:true}).count(),1);
    await f.page.getByRole('button',{name:'Create project',exact:true}).click();
    assert.deepEqual(JSON.parse(await f.page.locator('output').innerText()),{kind:'journey',journey:'create-project'});
    await f.page.getByRole('button',{name:'Create task',exact:true}).waitFor({state:'hidden'});
    assert.equal(await f.page.getByRole('button',{name:'Create task',exact:true}).count(),0);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('reference choices have a persistent full-well label and never create a project inside the dropdown', {timeout:180000},async()=>{
  const f=await svelteBrowser(`<script lang="ts">import ReferenceSpecimen from '@desert/svelte/pieces/ReferenceSpecimen.svelte';</script><ReferenceSpecimen owner="ReferenceSelector"/>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const trigger=f.page.getByRole('button',{name:'Projects',exact:true});
    assert.equal(await trigger.locator('[data-field-well] [data-slot="field-label"]').innerText(),'Projects');
    assert.ok((await trigger.boundingBox())!.height>=56);
    await trigger.click();
    await f.page.getByRole('checkbox',{name:'VOID',exact:true}).check();
    assert.equal(await f.page.getByRole('button',{name:'Create project',exact:true}).count(),0);
    await f.page.keyboard.press('Escape');
    assert.match(await trigger.innerText(),/VOID/);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
