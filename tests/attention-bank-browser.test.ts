import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';
import type {AttentionSignal} from '../src/attention.ts';

test('Home, list, detail and media use the same attention indicator, including reduced motion',{timeout:180000},async()=>{
  const id='10000000-0000-4000-8000-000000000001';
  const signal:AttentionSignal={version:'desert.attention/1',source:{kind:'activity',id:'10000000-0000-4000-8000-000000000002',revision:1,journey:'edit'},
    recipient:'identity',target:{kind:'object',object:'item',id},reason:'activity.resume',resolution:'producer'};
  const collection={version:'desert.bank-node/1',kind:'collection',object:'item',fields:['title'],labels:{'item.title':'Title'},
    records:[{id,version:1,facts:{title:'Review the draft'}}],loaded:true,disabled:false,selectedId:null,attention:{[id]:[signal]}};
  const context={version:'desert.bank-node/1',kind:'context',content:{kind:'context',details:{kind:'facts',object:'item',fields:['state'],facts:{state:'Open'},labels:{'item.state':'State'}},actions:[],attention:[signal]}};
  const media={...collection,fields:['asset'],labels:{'item.asset':'Media'},presentation:{kind:'media-grid',image:'asset'},
    records:[{id,version:1,facts:{asset:{kind:'asset',reference:'10000000-0000-4000-8000-000000000003',media:'audio'}}}]};
  const collections={...collection,presentation:{kind:'collection-grid',title:'title',previews:[{id,count:3}]}};
  const state={loaded:true,error:null,objectSignals:{},items:[{id:signal.source.id,journey:'edit',title:'Review the draft',description:'Continue where you left off.',available:true,signals:[signal]}]};
  const f=await svelteBrowser(`<script lang="ts">
    import BankRenderer from '@desert/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte';
    import AttentionList from '@desert/svelte/catalog/compositions/attention-list/AttentionList.svelte';
    const collection=${JSON.stringify(collection)},context=${JSON.stringify(context)},media=${JSON.stringify(media)},collections=${JSON.stringify(collections)},state=${JSON.stringify(state)};
  </script><main class="grid gap-4 p-4"><AttentionList {state} resume={()=>{}}/><BankRenderer node={collection}/><BankRenderer node={context}/><BankRenderer node={media}/><BankRenderer node={collections}/></main>`);
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    const dots=f.page.locator('[data-attention-indicator]');assert.equal(await dots.count(),5);
    assert.equal(await f.page.locator('.attention-row [data-record-copy]').evaluate(node=>getComputedStyle(node).flexDirection),'column');
    const paint=await dots.evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node);return [style.width,style.height,style.backgroundColor,style.animationDuration];}));
    assert.ok(paint.every(value=>JSON.stringify(value)===JSON.stringify(paint[0])));
    assert.equal(paint[0]![0],'8px');assert.equal(paint[0]![1],'8px');assert.equal(paint[0]![3],'1.8s');
    await f.page.emulateMedia({reducedMotion:'reduce'});
    assert.ok((await dots.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName))).every(value=>value==='none'));
    const directory=resolve('artifacts/attention/current');await mkdir(directory,{recursive:true});
    for(const width of [1440,390,320]){
      await f.page.setViewportSize({width,height:1000});
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await f.page.screenshot({path:resolve(directory,`attention-${width}.png`),fullPage:true});
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
