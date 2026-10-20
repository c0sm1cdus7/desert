import assert from 'node:assert/strict';
import test from 'node:test';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { choiceFamilySource } from './fixtures/choice-family.ts';

test('inline arrows select, picker arrows explore, activation commits and restores trigger',async()=>{
  const f=await svelteBrowser(choiceFamilySource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const radio=f.page.getByRole('radio',{name:'Alpine trail',exact:true}).first();
    await radio.focus(); await f.page.keyboard.press('ArrowDown');
    assert.equal(await f.page.locator('[data-single]').innerText(),'alps');
    const trigger=f.page.getByRole('button',{name:'Picker route',exact:true});
    await trigger.click(); const list=f.page.getByRole('listbox'); await list.waitFor();
    await f.page.keyboard.press('ArrowDown');
    assert.equal(await f.page.locator('[data-picker]').innerText(),'alpine');
    assert.equal(await list.locator('[data-value="alps"]').evaluate(el=>el===document.activeElement),true);
    await f.page.keyboard.press('Enter'); await list.waitFor({state:'hidden'});
    assert.equal(await f.page.locator('[data-picker]').innerText(),'alps');
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('required multiple choice allows an incomplete draft; maximum and unavailable choices remain enforced',async()=>{
  const f=await svelteBrowser(choiceFamilySource);
  try {
    const choices=f.page.locator('[data-case="multiple"]');
    await choices.getByRole('checkbox',{name:'Alpine trail',exact:true}).first().click();
    assert.equal(await f.page.locator('[data-multiple]').innerText(),'');
    await choices.getByRole('checkbox',{name:'Alpine trail',exact:true}).first().click();
    await choices.getByRole('checkbox',{name:'Alpine trail',exact:true}).nth(1).click();
    assert.equal(await choices.getByRole('checkbox',{name:'Beach walk'}).isDisabled(),true);
    assert.equal(await choices.getByRole('checkbox',{name:'Closed route'}).isDisabled(),true);
    assert.equal(await choices.getByRole('checkbox',{name:'Alpine trail',exact:true}).first().isDisabled(),false);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('picker duplicate-label typeahead cycles, prefix finds an option, Escape does not commit',async()=>{
  const f=await svelteBrowser(choiceFamilySource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const trigger=f.page.getByRole('button',{name:'Picker route',exact:true}); await trigger.click();
    const list=f.page.getByRole('listbox'); await list.waitFor();
    await f.page.keyboard.press('a');
    assert.equal(await list.locator('[data-value="alps"]').evaluate(el=>el===document.activeElement),true);
    await f.page.keyboard.press('a');
    assert.equal(await list.locator('[data-value="alpine"]').evaluate(el=>el===document.activeElement),true);
    await f.page.waitForTimeout(520); await f.page.keyboard.type('bea');
    assert.equal(await list.locator('[data-value="beach"]').evaluate(el=>el===document.activeElement),true);
    await f.page.keyboard.press('Escape'); await list.waitFor({state:'hidden'});
    assert.equal(await f.page.locator('[data-picker]').innerText(),'alpine');
    assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
