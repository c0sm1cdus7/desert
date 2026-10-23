import test from 'node:test';
import assert from 'node:assert/strict';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';

const fixture=`<script lang="ts">
  import {onMount} from 'svelte';
  import ReferenceSelector from '@desert/svelte/pieces/ReferenceSelector.svelte';
  import type {LabelsNode} from '@desert/interaction/labels-control.ts';
  let node=$state<LabelsNode>({version:'desert.control/1',kind:'labels',id:'projects',label:'Projects',disabled:false,
    values:[],limits:{maxItems:12,maxLength:64},reference:{options:[],loading:false,busy:false,uncertain:false,
      colors:[],maxLength:64}});
  onMount(()=>{
    (window as any).referenceEvents=[];
    (window as any).setReference=(patch:Record<string,unknown>)=>node={...node,reference:{...node.reference!,...patch}};
    (window as any).setDisabled=(disabled:boolean)=>node={...node,disabled};
  });
  function event(value:any){
    (window as any).referenceEvents.push(value);
    if(value.kind==='labels.change')node={...node,values:value.values};
  }
</script><h1>Reference selection witness</h1><ReferenceSelector {node} onevent={event}/>`;

test('reference selection refreshes existing choices but offers no nested creation path',{timeout:180000},async()=>{
  const f=await svelteBrowser(fixture);
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    const trigger=f.page.getByRole('button',{name:'Projects',exact:true});
    await trigger.click();
    await f.page.getByText('No options available.',{exact:true}).waitFor();
    assert.equal(await f.page.getByRole('button',{name:'Create project',exact:true}).count(),0);
    await f.page.evaluate(()=>{(window as any).setReference({options:[{value:'project-1',label:'Research',color:'green'}]});});
    await f.page.getByRole('checkbox',{name:'Research',exact:true}).check();
    await f.page.keyboard.press('Escape');
    assert.match(await trigger.innerText(),/Research/);
    assert.deepEqual(await f.page.evaluate(()=>(window as any).referenceEvents),[
      {kind:'reference.refresh',control:'projects'},{kind:'labels.change',control:'projects',values:['project-1']}]);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('reference selection becomes unavailable without discarding selected labels or issuing writes',{timeout:180000},async()=>{
  const f=await svelteBrowser(fixture);
  try{
    await f.page.evaluate(()=>{(window as any).setReference({options:[{value:'project-1',label:'Research',color:'green'}]});});
    const trigger=f.page.getByRole('button',{name:'Projects',exact:true});
    await trigger.click();await f.page.getByRole('checkbox',{name:'Research',exact:true}).check();
    await f.page.evaluate(()=>{(window as any).setDisabled(true);});
    assert.equal(await trigger.isDisabled(),true);
    await f.page.getByRole('checkbox',{name:'Research',exact:true}).waitFor({state:'hidden'});
    assert.match(await trigger.innerText(),/Research/);
    await trigger.evaluate(button=>(button as HTMLButtonElement).click());
    assert.equal(await f.page.getByRole('checkbox',{name:'Research',exact:true}).count(),0);
    assert.equal(await f.page.evaluate(()=>(window as any).referenceEvents.some((event:any)=>event.kind==='reference.create')),false);
    await f.page.evaluate(()=>{(window as any).setDisabled(false);});
    await trigger.click();assert.equal(await f.page.getByRole('checkbox',{name:'Research',exact:true}).isChecked(),true);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('only an installed reference creation capability exposes a companion form and same-operation recovery',{timeout:180000},async()=>{
  const f=await svelteBrowser(fixture.replace("colors:[],maxLength:64", "createLabel:'Create collection',colors:[],maxLength:64"));
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.getByRole('button',{name:'Projects',exact:true}).click();
    const create=f.page.getByRole('button',{name:'Create collection',exact:true});
    await create.click();
    await f.page.getByRole('textbox',{name:'Name',exact:true}).fill('Japan');
    await create.click();
    assert.deepEqual(await f.page.evaluate(()=>(window as any).referenceEvents),[
      {kind:'reference.refresh',control:'projects'},{kind:'reference.create',control:'projects',name:'Japan'}]);
    await f.page.evaluate(()=>{(window as any).setReference({uncertain:true,error:'The result is not confirmed.'});});
    const recover=f.page.getByRole('button',{name:'Check result',exact:true});
    await recover.click();
    assert.deepEqual(await f.page.evaluate(()=>(window as any).referenceEvents.at(-1)),{kind:'reference.recover',control:'projects'});
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('reference dropdown keeps a full labeled well and readable choices at narrow and wide widths',{timeout:180000},async()=>{
  const f=await svelteBrowser(`<script lang="ts">import ReferenceSpecimen from '@desert/svelte/pieces/ReferenceSpecimen.svelte';</script><ReferenceSpecimen owner="ReferenceSelector"/>`);
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    for(const width of [1440,390,320]){
      await f.page.setViewportSize({width,height:900});
      const trigger=f.page.getByRole('button',{name:'Projects',exact:true});
      assert.equal(await trigger.locator('[data-slot="field-label"]').innerText(),'Projects');
      assert.ok((await trigger.boundingBox())!.height>=56);
      await trigger.click();
      await f.page.getByRole('checkbox',{name:'VOID',exact:true}).check();
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await f.page.keyboard.press('Escape');
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
