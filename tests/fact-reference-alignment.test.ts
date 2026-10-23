import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
test('reference facts paint against the same right edge as scalar facts at wide and compact sizes',async()=>{
  const f=await svelteBrowser(`<script lang="ts">
    import FactRow from '@desert/svelte/pieces/FactRow.svelte';
    const references=[{value:'one',label:'Research',color:'blue'},{value:'two',label:'VOID',color:'green'}];
  </script><dl><FactRow label="Projects" value={['one','two']} {references}/><FactRow label="Status" value="Open"/></dl>`);
  try{
    await f.page.addStyleTag({content:await rendererCss()});
    for(const width of [900,320])for(const scale of [1,2]){
      await f.page.setViewportSize({width,height:900});
      await f.page.evaluate(value=>document.documentElement.style.setProperty('--text-scale',String(value)),scale);
      const geometry=await f.page.locator('.fact-row').first().evaluate(row=>{
        const value=row.querySelector('dd')!,label=row.querySelector('dt')!;
        const references=[...row.querySelectorAll('.reference-value')].map(item=>item.getBoundingClientRect());
        return {right:value.getBoundingClientRect().right,lastRight:references.at(-1)!.right,
          labelRight:label.getBoundingClientRect().right,left:Math.min(...references.map(item=>item.left)),
          balance:getComputedStyle(value).textWrap,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(Math.abs(geometry.right-geometry.lastRight)<1,`${width}/${scale}: final reference is right-aligned`);
      assert.ok(geometry.left>=geometry.labelRight,'the reference remains in the right column');
      assert.equal(geometry.balance,'balance');assert.equal(geometry.overflow,false);
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
