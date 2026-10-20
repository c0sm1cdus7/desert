import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { paneFamilySource } from './fixtures/pane-family.ts';

test('pane state feedback preserves its material and dims only content once',async()=>{
  const f=await svelteBrowser(paneFamilySource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const button=f.page.getByRole('button',{name:'Continue',exact:true});
    const measure=()=>button.evaluate(e=>{const s=getComputedStyle(e);return {fill:s.backgroundColor,blur:s.backdropFilter,border:s.borderTopColor,image:s.backgroundImage,opacity:s.opacity};});
    const resting=await measure();
    await button.hover();assert.deepEqual(await measure(),resting);
    await f.page.mouse.down();assert.deepEqual(await measure(),resting);await f.page.mouse.up();
    const nav=f.page.locator('[data-slot="sidebar-menu-button"]');
    // Owner's v123 ruling replaces the earlier text/check navigation treatment.
    assert.equal(await nav.locator('[data-navigation-selected]').count(),0);
    assert.equal(await nav.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 95, 207)');
    await f.page.locator('[data-test-controls]').getByRole('button',{name:'disabled',exact:true}).click();
    assert.deepEqual(await measure(),resting);
    assert.equal(await button.locator('[data-button-content]').evaluate(e=>getComputedStyle(e).opacity),'0.5');
    const field=f.page.locator('[data-primitive="input.text"]');
    assert.equal(await field.locator('[data-field-row]').evaluate(e=>getComputedStyle(e).opacity),'0.5');
    assert.equal(await field.getByRole('textbox').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await field.locator('[data-slot="field-label"]').evaluate(e=>getComputedStyle(e).opacity),'1');
    const choice=f.page.locator('[data-choice-anatomy]').first();
    assert.equal(await choice.evaluate(e=>getComputedStyle(e).opacity),'0.5');
    assert.equal(await choice.locator('[role="radio"]').evaluate(e=>getComputedStyle(e).opacity),'1');
    await f.page.locator('[data-test-controls]').getByRole('button',{name:'invalid',exact:true}).click();
    const well=field.locator('.field-well');
    const error=await well.evaluate(e=>{const s=getComputedStyle(e);return {outline:s.outlineColor,border:s.borderTopColor,width:s.outlineWidth};});
    assert.equal(error.width,'2px');assert.notEqual(error.outline,error.border);
    await field.getByRole('textbox').focus();
    assert.notEqual(await well.evaluate(e=>getComputedStyle(e).outlineColor),error.outline,'focus and error have separate ink');
    assert.equal(await well.evaluate(e=>getComputedStyle(e).borderTopColor),error.border);
    assert.equal(await field.getByRole('status').innerText(),'Give this trip a name.');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('pane family remains readable in both themes, narrow and enlarged text',async()=>{
  const f=await svelteBrowser(paneFamilySource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const directory='artifacts/ui-maturity-v118/material/renders';await mkdir(directory,{recursive:true});
    for(const theme of ['light','dark']) for(const [width,scale] of [[1280,1],[390,1],[320,2]] as const) {
      await f.page.setViewportSize({width,height:900});
      await f.page.evaluate(({theme,scale})=>{document.documentElement.dataset.theme=theme;document.documentElement.style.setProperty('--text-scale',String(scale));},{theme,scale});
      await f.page.screenshot({path:directory+'/'+theme+'-'+width+'-text'+scale+'.png',fullPage:true});
      assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const axe=await new AxeBuilder({page:f.page}).include('main').withRules(['color-contrast']).analyze();
      assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})),[],theme+'/'+width);
    }
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
