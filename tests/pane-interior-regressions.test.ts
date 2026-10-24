import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { groupedRowsSource } from './fixtures/grouped-rows.ts';

test('neutral interiors preserve action-list dividers without acquiring another pane', async () => {
  const f = await svelteBrowser(groupedRowsSource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    // Context actions are Rows in a List (composition lane C).
    const rows = f.page.locator('[data-test="actions"] [data-row]');
    assert.equal(await rows.count(),3);
    for (let i=0;i<3;i++) {
      const style=await rows.nth(i).evaluate(e=>{const s=getComputedStyle(e);return {
        top:s.borderTopWidth,bottom:s.borderBottomWidth,fill:s.backgroundColor,blur:s.backdropFilter};});
      assert.equal(style.top,i===0?'0px':'1px');
      assert.equal(style.bottom,'0px');
      assert.equal(style.fill,'rgba(0, 0, 0, 0)');
      assert.equal(style.blur,'none');
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('custom navigation retains content-only press, native link semantics and cancellation', async () => {
  const f=await svelteBrowser(`<script>
    import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
    let clicks=$state(0);
  </script><Sidebar.Provider><Sidebar.Root collapsible="none"><Sidebar.Content><Sidebar.Menu><Sidebar.MenuItem>
    <Sidebar.MenuButton isActive aria-current="page" aria-label="Destination" onclick={e=>{e.preventDefault();clicks++}}>
      {#snippet child({props})}<a {...props} href="#destination"><span>Destination</span></a>{/snippet}
    </Sidebar.MenuButton>
  </Sidebar.MenuItem></Sidebar.Menu></Sidebar.Content></Sidebar.Root><output>{clicks}</output></Sidebar.Provider>`);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const link=f.page.getByRole('link',{name:'Destination',exact:true});
    const state=()=>link.evaluate(e=>{const s=getComputedStyle(e);return {
      box:e.getBoundingClientRect().toJSON(),fill:s.backgroundColor,paint:s.backgroundImage,
      transform:s.transform,content:getComputedStyle(e.querySelector('span')!).transform};});
    const settle=()=>f.page.evaluate(async()=>{await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
    await link.hover();await settle();const rest=await state();
    await f.page.mouse.down();await settle();const held=await state();
    assert.notEqual(held.content,rest.content,'the label responds even without a Button wrapper');
    assert.deepEqual(held.box,rest.box);assert.equal(held.transform,'none');
    assert.equal(held.fill,rest.fill);assert.equal(held.paint,'none');
    await f.page.mouse.move(900,700);await settle();await f.page.mouse.up();
    assert.equal((await state()).content,rest.content);
    assert.equal(await f.page.locator('output').innerText(),'0');
    await link.focus();await f.page.keyboard.down('Enter');await settle();
    assert.notEqual((await state()).content,rest.content);
    await f.page.keyboard.up('Enter');
    assert.equal(await f.page.locator('output').innerText(),'1');
    assert.equal(await link.getAttribute('href'),'#destination');
    assert.equal(await link.getAttribute('aria-current'),'page');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
