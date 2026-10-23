import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { settle } from './web/public-catalog-expectations.ts';

for (const initialWidth of [600, 320]) test(`selection cursor survives presentation replacement from ${initialWidth}`, async () => {
  const f = await svelteBrowser(`<script>
    import SelectControl from '@desert/svelte/catalog/compositions/select-control/SelectControl.svelte';
    let node=$state({version:'desert.control/1',kind:'select',id:'destination',label:'Destination',required:false,
      disabled:false,value:'fuji',options:[{value:'fuji',label:'Mount Fuji',disabled:false},
      {value:'closed',label:'Closed',disabled:true},{value:'alps',label:'Alps',disabled:false},
      {value:'everest',label:'Mount Everest',disabled:false}]}), edits=$state(0);
  </script><main style="padding:20px">
    <SelectControl {node} onevent={event=>{node={...node,value:event.value};edits++}} />
    <output>{node.value}/{edits}</output>
  </main>`);
  try {
    await f.page.setViewportSize({ width: initialWidth, height: 900 });
    await f.page.addStyleTag({ content: await rendererCss() });
    const trigger=f.page.locator('[data-selection-trigger]');
    await trigger.click(); await settle(f.page);
    await f.page.keyboard.press('ArrowDown'); await f.page.keyboard.press('ArrowDown');
    const active=()=>f.page.evaluate(()=>document.activeElement?.textContent?.trim());
    assert.equal(await active(),'Mount Everest');
    await f.page.keyboard.press('m'); assert.equal(await active(),'Mount Fuji');
    await f.page.keyboard.press('m'); assert.equal(await active(),'Mount Everest', 'Repeated letters cycle matching enabled options');
    assert.equal(await f.page.getByRole('listbox').locator('[tabindex="0"]').count(),1);
    assert.equal(await f.page.getByRole('listbox').locator('[aria-pressed],[aria-checked]').count(),0);
    for (const width of [initialWidth === 600 ? 320 : 600, initialWidth]) {
      await f.page.setViewportSize({ width, height: 900 }); await settle(f.page);
      assert.equal(await active(),'Mount Everest');
      assert.equal(await f.page.getByRole('listbox').count(),1);
      assert.equal(await trigger.getAttribute('aria-controls'),await f.page.getByRole('listbox').getAttribute('id'));
      assert.equal(await f.page.locator('output').textContent(),'fuji/0');
    }
    await f.page.keyboard.press('Escape'); await settle(f.page);
    assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
    await trigger.click(); await settle(f.page); await f.page.keyboard.press('ArrowDown');
    assert.equal(await active(),'Alps','New exploration starts from selected value');
    await f.page.keyboard.press('Enter'); await settle(f.page);
    assert.equal(await f.page.locator('output').textContent(),'alps/1');
    assert.deepEqual(f.errors,[]);
  } finally { await f.close(); }
});
