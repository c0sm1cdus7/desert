import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir } from 'node:fs/promises';
import { InteractionCatalog } from '../src/interaction/catalog.ts';
import { compilePublicCatalog } from '../src/public-catalog/index.ts';
import { catalogFixture } from './fixtures/public-catalog.ts';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';

const surface = compilePublicCatalog(catalogFixture()).surface;
const source = `<script>
  import PublicCatalogBank from './src/svelte/explorer/PublicCatalogBank.svelte';
  const surface = ${JSON.stringify(surface)};
</script><main style="padding:16px"><PublicCatalogBank {surface} oncatalog={() => {}} /></main>`;

test('the actual bank exposes four canonical families, shared owners and honest coverage', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const navigation = f.page.getByRole('navigation', {name:'Catalog navigation'});
    assert.deepEqual(await navigation.getByRole('link').allTextContents(),
      InteractionCatalog.groups.map(group => `${group.title} · ${InteractionCatalog.entries.filter(entry => entry.inspection.group === group.id).length}`));
    assert.match(await navigation.getByRole('status').innerText(), /23 of 23 components · 57 fixtures/);
    assert.equal(await f.page.locator('[data-foundation]').count(), 6);
    for (const owner of InteractionCatalog.foundations)
      assert.ok(await f.page.locator(`[data-foundation="${owner.id}"]`).getByText(owner.rule, {exact:true}).isVisible());
    for (const entry of InteractionCatalog.entries) {
      const section = f.page.locator(`[data-catalog-entry="${entry.id}"]`);
      assert.equal(await section.count(), 1);
      assert.equal(await section.locator('[data-specimen]').count(), entry.states.length);
      const inspection = section.locator('[data-contract-inspection]');
      assert.match(await inspection.innerText(), /Qualification\s+Partial/);
      for (const gap of entry.inspection.gaps) assert.ok(await inspection.getByText(gap, {exact:true}).isVisible());
      for (const evidence of entry.inspection.evidence) assert.ok(await inspection.getByText(evidence, {exact:true}).isVisible());
    }
    assert.equal(await f.page.locator('details,summary').count(), 0);
    assert.equal(await f.page.locator('[data-specimen="form:ready"]').getAttribute('data-bank-coverage'), 'gap');
    await f.page.emulateMedia({colorScheme:'dark'});
    await f.page.getByRole('searchbox',{name:'Find component',exact:true}).fill('control.money');
    await f.page.locator('[data-catalog-entry="control.money"]').scrollIntoViewIfNeeded();
    await mkdir('artifacts/ui-stabilization-v119/bank',{recursive:true});
    await f.page.screenshot({path:'artifacts/ui-stabilization-v119/bank/inspector-money-dark.png'});
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('discovery filtering preserves mounted writing and choice drafts across all four hosts', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    const search = f.page.getByRole('searchbox', {name:'Find component',exact:true});
    const writing = f.page.locator('[data-specimen="input.text:value"] input');
    await writing.fill('Keep my bank draft');
    const original = await writing.elementHandle();
    await search.fill('control.options');
    const radio = f.page.locator('[data-specimen="control.options:one"]').getByRole('radio',{name:'Second option',exact:true});
    await radio.check();
    const originalRadio = await radio.elementHandle();
    for (const query of ['Foundations','Compositions','Product examples','no-such-entry','']) await search.fill(query);
    assert.equal(await writing.inputValue(), 'Keep my bank draft');
    assert.ok(await writing.evaluate((element, initial) => element === initial, original));
    assert.ok(await radio.isChecked());
    assert.ok(await radio.evaluate((element, initial) => element === initial, originalRadio));
    assert.equal(await f.page.locator('[data-catalog-entry]:visible').count(), 23);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test('family navigation is keyboard-accessible and inspection reflows at 320px / 200% text', async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:320,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(() => document.documentElement.style.setProperty('--text-scale','2'));
    const navigation=f.page.getByRole('navigation',{name:'Catalog navigation'});
    await navigation.getByRole('link',{name:/^Controls/}).focus();
    await f.page.keyboard.press('Enter');
    assert.equal(await f.page.evaluate(() => document.activeElement?.id),'catalog-controls');
    const controls=f.page.getByRole('region',{name:'Controls',exact:true});
    await controls.getByRole('link',{name:'Back to catalog navigation',exact:true}).focus();
    await f.page.keyboard.press('Enter');
    assert.equal(await f.page.evaluate(() => document.activeElement?.id),'catalog-search');
    const titleGeometry = await f.page.locator('#catalog-foundations').evaluate(element => {
      const range=document.createRange(); range.selectNodeContents(element);
      return {lines:range.getClientRects().length,width:element.getBoundingClientRect().width,font:getComputedStyle(element).font};
    });
    assert.equal(titleGeometry.lines,1,JSON.stringify(titleGeometry));
    const overflow = await f.page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
      .slice(0,12).map(element => ({tag:element.tagName,classes:element.className,text:element.textContent?.slice(0,90),bounds:element.getBoundingClientRect().toJSON(),position:getComputedStyle(element).position,width:getComputedStyle(element).width,left:getComputedStyle(element).left})));
    assert.ok(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow));
    await mkdir('artifacts/ui-stabilization-v119/bank',{recursive:true});
    await f.page.screenshot({path:'artifacts/ui-stabilization-v119/bank/inspector-320-200.png'});
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
