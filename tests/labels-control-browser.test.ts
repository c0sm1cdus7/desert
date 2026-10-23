import test from 'node:test';
import assert from 'node:assert/strict';
import {svelteBrowser} from './fixtures/svelte-browser.ts';
import {rendererCss} from './fixtures/renderer-css.ts';

test('labels use a creation popover and compact removable rail without an exposed input',{timeout:180000},async()=>{
  const f=await svelteBrowser(`<script lang="ts">
    import BankRenderer from '@desert/svelte/BankRenderer.svelte';
    import {applyControlEvent} from '@desert/interaction/control-nodes.ts';
    let control=$state({version:'desert.control/1',kind:'labels',id:'labels',label:'Labels',disabled:false,values:[],limits:{maxItems:2,maxLength:64}});
  </script><BankRenderer node={{version:'desert.bank-node/1',kind:'control.labels',control}} onevent={event=>{if(event.kind==='labels.change')control=applyControlEvent(control,event).node}}/>`);
  try{
    f.page.setDefaultTimeout(10000);
    await f.page.addStyleTag({content:await rendererCss()});
    const add=f.page.getByRole('button',{name:'Add label',exact:true});
    const input=f.page.getByRole('textbox',{name:'Label',exact:true});
    assert.equal(await input.count(),0);
    await add.click();await input.fill('  Desert SDK  ');await input.press('Enter');await input.waitFor({state:'detached'});
    assert.equal(await input.count(),0);
    assert.deepEqual((await f.page.locator('.label-rail li').allTextContents()).map(value=>value.trim()),['Desert SDK']);
    await add.click();await input.fill('Desert SDK');await input.press('Enter');
    assert.equal(await input.inputValue(),'Desert SDK');
    assert.equal(await f.page.getByRole('alert').textContent(),'This label is already added.');
    await input.fill('A,B');await input.press('Enter');await input.waitFor({state:'detached'});
    assert.deepEqual((await f.page.locator('.label-rail li').allTextContents()).map(value=>value.trim()),['Desert SDK','A,B']);
    assert.equal(await add.isDisabled(),true);
    for(const width of [320,1440]){
      await f.page.setViewportSize({width,height:800});
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const geometry=await f.page.getByRole('button',{name:'Remove Desert SDK',exact:true}).boundingBox();
      assert.ok(geometry&&geometry.width<=44&&geometry.height<=44);
    }
    await f.page.getByRole('button',{name:'Remove Desert SDK',exact:true}).click();
    assert.equal(await add.isDisabled(),false);
    await add.click();await input.fill('🌵'.repeat(65));
    assert.equal(await f.page.locator('[data-character-counter]').textContent(),'1 over limit');
    assert.equal(await input.inputValue(),'🌵'.repeat(65),'over-limit writing is preserved for canonical validation');
    await input.press('Enter');await input.waitFor({state:'detached'});
    assert.deepEqual((await f.page.locator('.label-rail li').allTextContents()).map(value=>value.trim()),['A,B','🌵'.repeat(65)]);
    await f.page.setViewportSize({width:320,height:800});
    assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
