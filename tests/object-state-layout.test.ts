import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

test('contextual status values stay complete and end aligned at narrow widths and 200% text', async () => {
  const f = await svelteBrowser(`<script>
    import ObjectStateControl from '@desert/svelte/catalog/compositions/object-state-control/ObjectStateControl.svelte';
    let value=$state('completed');
    const options=[{value:'open',label:'Open',available:true,journey:'open'},
      {value:'completed',label:'Completed',available:true,journey:'completed'},
      {value:'long',label:'Awaiting a response from the project owner',available:true,journey:'long'}];
  </script>
  <main style="padding:24px 34px;min-width:0">
    <ObjectStateControl selectors={[{field:'state',label:'Status',value,disabled:false,options}]} onselect={next=>value=next}/>
    <ObjectStateControl selectors={[{field:'long-state',label:'Publication review status',value:'long',disabled:false,options}]} onselect={()=>{}}/>
  </main>`,{},undefined,{initialCss:await rendererCss()});
  const evidence = new URL('../artifacts/object-state-layout/', import.meta.url);
  try {
    await f.page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await mkdir(evidence,{recursive:true});
    for (const width of [320,390]) for (const scale of [1,2]) {
      await f.page.setViewportSize({width,height:900});
      await f.page.evaluate(scale=>document.documentElement.style.fontSize=`${scale*16}px`,scale);
      const metrics=await f.page.locator('[data-primitive="object-state-row"]').evaluateAll(rows=>rows.map(row=>{
        const button=row.querySelector('button')!, text=row.querySelector('.selection-label')!,
          value=row.querySelector('.selection-value')!, chevron=row.querySelector('[data-control-chevron]')!;
        const r=row.getBoundingClientRect(),b=button.getBoundingClientRect(),t=text.getBoundingClientRect(),c=chevron.getBoundingClientRect();
        const style=getComputedStyle(text), range=document.createRange(); range.selectNodeContents(text);
        return {row:r.toJSON(),button:b.toJSON(),text:t.toJSON(),glyphs:range.getBoundingClientRect().toJSON(),chevron:c.toJSON(),
          overflow:style.overflow,textOverflow:style.textOverflow,whiteSpace:style.whiteSpace,
          align:getComputedStyle(value).textAlign,padding:getComputedStyle(button).padding,
          scrollWidth:(row as HTMLElement).scrollWidth,clientWidth:(row as HTMLElement).clientWidth};
      }));
      assert.equal(metrics.length,2,'both actual state rows are measured');
      for (const m of metrics) {
        assert.equal(m.align,'end');
        assert.equal(m.padding,`${scale*8}px ${scale*16}px`,'The embedded selection retains its shared rounded-button hit inset, not a consumer override');
        assert.notEqual(m.textOverflow,'ellipsis'); assert.notEqual(m.whiteSpace,'nowrap');
        assert.notEqual(m.overflow,'hidden'); assert.ok(m.scrollWidth<=m.clientWidth+1);
        assert.ok(m.text.left>=m.button.left-1 && m.text.right<=m.chevron.left+1);
        assert.ok(m.glyphs.top>=m.button.top-1 && m.glyphs.bottom<=m.button.bottom+1,
          `Text cannot be clipped at ${width}px / ${scale}×: ${JSON.stringify(m)}`);
        assert.ok(m.button.left>=m.row.left-1 && m.button.right<=m.row.right+1);
      }
      assert.equal(await f.page.locator('.required,[aria-required="true"],[aria-describedby]').count(),0);
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await f.page.screenshot({path:new URL(`${width}-${scale}x.png`,evidence).pathname,fullPage:true});
    }
    await f.page.getByRole('button',{name:'Status',exact:true}).click();
    await f.page.getByRole('option',{name:'Open',exact:true}).click();
    assert.equal(await f.page.getByRole('button',{name:'Status',exact:true}).innerText(),'Open');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
