import test from 'node:test';
import assert from 'node:assert/strict';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';

test('membership choices share a grouped pane and stop accepting toggles while an outcome is uncertain',async()=>{
  const f=await svelteBrowser(`<script lang="ts">
    import RelatedSelection from '@desert/svelte/catalog/compositions/related-selection/RelatedSelection.svelte';
    let checked=$state(false),uncertain=$state(false),events=$state(0);
    let state=$derived({revision:0,busy:false,uncertain,dirty:false,committing:uncertain,groups:[{input:'media',label:'Media',loading:false,busy:false,uncertain,
      ...(uncertain?{error:'Check the same operation.'}:{}),items:[{id:'image',label:'Image 1',checked},{id:'video',label:'Video 2',checked:false}]}]});
  </script><RelatedSelection {state} onevent={event=>{events++;if(event.kind==='related.change')checked=event.checked;else uncertain=false;}}/>
  <button onclick={()=>uncertain=true}>Lose response</button><output>{events}</output>`);
  try{
    await f.page.setViewportSize({width:390,height:844});
    await f.page.addStyleTag({content:await rendererCss()});
    const image=f.page.getByRole('checkbox',{name:'Image 1',exact:true});
    await image.click();assert.equal(await image.isChecked(),true);
    // Lane B: the rows are Choice rows of one pane (the choice's own marks).
    assert.equal(await f.page.locator('[data-choice="rows"] [data-choice-row]').count(),2);
    const grouped=f.page.locator('[data-choice="rows"]');
    assert.equal(await grouped.evaluate(node=>node.scrollWidth<=node.clientWidth),true);
    await f.page.getByRole('button',{name:'Lose response'}).click();
    assert.equal(await image.isDisabled(),true);
    await f.page.getByRole('button',{name:'Check result',exact:true}).click();
    assert.equal(await image.isDisabled(),false);assert.equal(await f.page.locator('output').innerText(),'2');
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
