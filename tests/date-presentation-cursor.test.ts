import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { settle } from './web/public-catalog-expectations.ts';

for (const initialWidth of [600, 320]) test(`date cursor survives presentation replacement from ${initialWidth}`, async () => {
  const f = await svelteBrowser(`<script>
    import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
    let node=$state({version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival',required:false,
      disabled:false,value:'2026-10-16'}), edits=$state(0);
  </script><main style="padding:20px">
    <DateControl {node} onevent={event=>{node={...node,value:event.value};edits++}} />
    <output>{node.value}/{edits}</output>
  </main>`);
  try {
    await f.page.setViewportSize({ width: initialWidth, height: 900 });
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.locator('[data-field-trigger]').click();
    await f.page.getByRole('button', { name: 'Next month', exact: true }).click();
    await settle(f.page);
    const title = f.page.locator('[data-date-calendar-month]');
    assert.equal(await title.textContent(), 'November 2026');
    await f.page.setViewportSize({ width: initialWidth === 600 ? 320 : 600, height: 900 });
    await settle(f.page);
    assert.equal(await title.textContent(), 'November 2026');
    assert.equal(await f.page.getByRole('application').count(), 1);
    assert.equal(await f.page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement && active !== document.body && active.checkVisibility()
        && !active.closest('[inert],[aria-hidden="true"]');
    }), true, 'Presentation replacement retains usable focus');
    assert.equal(await f.page.locator('output').textContent(), '2026-10-16/0', 'Browsing never edits the selected value');
    await f.page.keyboard.press('Escape'); await settle(f.page);
    assert.equal(await f.page.locator('[data-field-trigger]').evaluate(element=>element===document.activeElement),true,
      'Dismissal returns focus to the current trigger instance');
    await f.page.locator('[data-field-trigger]').click(); await settle(f.page);
    assert.equal(await title.textContent(), 'October 2026', 'A fresh task still opens the selected date');
    await f.page.getByRole('button', { name: /October 20, 2026/ }).click(); await settle(f.page);
    assert.equal(await f.page.locator('output').textContent(), '2026-10-20/1');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('date dismissal preserves focus already moved outside its own surface', async () => {
  const f=await svelteBrowser(`<script>
    import DateControl from '@desert/svelte/catalog/foundations/date-control/DateControl.svelte';
  </script><DateControl node={{version:'desert.control/1',kind:'date',id:'arrival',label:'Arrival',
    required:false,disabled:false,value:'2026-10-16'}} onevent={()=>{}}/>
    <input aria-label="Other field" style="position:fixed;bottom:20px;right:20px"/>`);
  try {
    await f.page.setViewportSize({width:900,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.locator('[data-field-trigger]').click(); await settle(f.page);
    const outside=f.page.getByRole('textbox',{name:'Other field'});
    await outside.click(); await settle(f.page);
    await f.page.getByRole('application').waitFor({state:'hidden'});
    assert.equal(await outside.evaluate(element=>element===document.activeElement),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
