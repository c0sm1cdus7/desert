import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, readFile } from 'node:fs/promises';
import { ResolvedNodes } from '../src/interaction/catalog.ts';
import { catalogTitle } from '../src/svelte/infra/catalog-entries.ts';
import { sharedCatalogOwners } from '../src/svelte/infra/shared-owners.ts';
import { sharedPurpose, sharedIndexOwners } from '../src/svelte/infra/shared-purpose.ts';
import { compilePublicCatalog } from '../src/public-catalog/index.ts';
import { catalogFixture } from './fixtures/public-catalog.ts';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { catalogWorkspaceSource } from './fixtures/catalog-workspace.ts';

const surface = compilePublicCatalog(catalogFixture()).surface;
const source = `<script>
  import PublicCatalogBank from './src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte';
  const surface = ${JSON.stringify(surface)};
</script><main style="padding:16px"><PublicCatalogBank {surface} oncatalog={() => {}} /></main>`;

test('the bank index groups the whole inventory and each detail exposes real states and honest coverage', {timeout:60000}, async () => {
  const f = await svelteBrowser(source,{},undefined,{initialCss:await rendererCss()});
  try {
    const index=f.page.locator('[data-view-item="catalog-index"]');
    assert.equal(await f.page.getByRole('navigation',{name:'Catalog navigation'}).count(),0,'no invented category-button rail');
    for(const group of ResolvedNodes.groups) {
      const stack=index.getByRole('group',{name:group.title,exact:true});
      assert.deepEqual((await stack.locator('[data-focus-key]').allTextContents()).map(text=>text.trim()),
        [...ResolvedNodes.entries.filter(entry=>entry.inspection.group===group.id).map(entry=>catalogTitle(entry.id)),
          ...sharedIndexOwners(group.id).map(owner=>sharedPurpose[owner].title)]);
      assert.equal(await stack.locator('[data-list="rows"]').count(),1);
    }
    assert.equal(await index.getByRole('group',{name:'Coverage',exact:true}).count(),0,'coverage belongs to each detail, not a third index category');
    assert.equal(await f.page.locator('[data-view-item^="entry:"]:visible').count(),0);
    for(const entry of ResolvedNodes.entries) {
      const opener=index.locator(`[data-focus-key="${entry.id}"]`);
      await opener.click();
      const section=f.page.locator(`[data-view-item="entry:${entry.id}"]`);
      assert.equal(await f.page.locator('[data-view-item^="entry:"]:visible').count(),1);
      assert.equal(await section.locator('[data-view-item^="specimen:"]').count(),entry.states.length,'states remain mounted for draft retention');
      assert.equal(await section.locator('[data-view-item^="specimen:"]:visible').count(),1,'only the selected state is presented');
      const inspection=section.locator(`[data-view-item="contract:${entry.id}"]`);
      assert.match(await inspection.innerText(),/Qualification\s+\d+ declared fixtures · partial/);
      for(const gap of entry.inspection.gaps) assert.ok(await inspection.getByText(gap,{exact:true}).isVisible());
      for(const reference of entry.inspection.evidence) assert.ok(await inspection.getByText(reference,{exact:true}).isVisible());
      await f.page.getByRole('button',{name:'Back',exact:true}).click();
      assert.ok(await opener.evaluate(element=>element===document.activeElement));
    }
    assert.equal(await f.page.locator('details,summary').count(),0);
    // A coverage gap is the unavailable note in place of the specimen (its row is mounted but not the shown state).
    assert.equal(await f.page.locator('[data-view-item="specimen:form:ready"] [role="note"][aria-label="Specimen unavailable"]').count(),1);
    assert.equal(await f.page.getByRole('searchbox').count(),0,'catalog content never owns an inline search');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('every shared-owner index entry opens its actual finite specimen', async()=>{
  const f=await svelteBrowser(source,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const index=f.page.locator('[data-view-item="catalog-index"]');
    for(const owner of sharedCatalogOwners){
      const parent=sharedPurpose[owner].partOf;
      if(parent) await index.locator(`[data-focus-key="${parent}"]`).click();
      await f.page.locator(`[data-view-item="public-catalog-bank"] [data-focus-key="${owner}"]:visible`).click();
      const specimen=f.page.locator(`[data-view-item="owner:${owner}"]`);
      assert.ok(await specimen.isVisible(),owner);
      assert.equal(await f.page.locator('[data-view-item^="owner:"]:visible').count(),1);
      await f.page.locator('[data-view-item="shared-owner-catalog"] > * > [data-piece="toolbar"]').getByRole('button',{name:'Back',exact:true}).click();
      if(parent) await f.page.locator('[data-view-item="public-catalog-bank"] > * > [data-piece="toolbar"], [data-view-item="shared-owner-catalog"] > * > [data-piece="toolbar"]').getByRole('button',{name:'Back',exact:true}).click();
    }
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});

test('toolbar discovery opens indexed details without unmounting local writing and selection drafts', async () => {
  const f=await svelteBrowser(catalogWorkspaceSource);
  try {
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.emulateMedia({reducedMotion:'reduce'});
    const search=f.page.getByRole('searchbox',{name:'Search visual catalog',exact:true});
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="input.text"]').click();
    let entry=f.page.locator('[data-view-item="entry:input.text"]');
    await entry.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'value',exact:true}).click();
    const writing=f.page.locator('[data-view-item="specimen:input.text:value"] input');
    await writing.fill('Keep my bank draft');
    const original=await writing.elementHandle();
    await f.page.getByRole('button',{name:'Search',exact:true}).click();
    await search.fill('control.options');
    await f.page.locator('[data-search-result="control.options"] button').click();
    entry=f.page.locator('[data-view-item="entry:control.options"]');
    await entry.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'one',exact:true}).click();
    const radio=f.page.locator('[data-view-item="specimen:control.options:one"]').getByRole('radio',{name:'Second option',exact:true});
    await radio.check();
    const originalRadio=await radio.elementHandle();
    await f.page.getByRole('button',{name:'Search',exact:true}).click();
    for(const query of ['Foundations','Compositions','Product examples','no-such-entry','']) {
      await search.fill(query);
      assert.equal(await f.page.locator('[data-view-item^="entry:"]').count(),ResolvedNodes.entries.length);
      if(query==='no-such-entry') assert.equal(await f.page.locator('[data-search-result]').count(),0);
    }
    await f.page.getByRole('button',{name:'Close search',exact:true}).click();
    assert.ok(await radio.isChecked());
    assert.ok(await radio.evaluate((element,initial)=>element===initial,originalRadio));
    assert.equal(await f.page.locator('[data-view-item^="entry:"]:visible').count(),1);
    await f.page.getByRole('button',{name:'Back',exact:true}).click();
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="input.text"]').click();
    assert.equal(await writing.inputValue(),'Keep my bank draft');
    assert.ok(await writing.evaluate((element,initial)=>element===initial,original));
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('indexed component navigation is keyboard-accessible and details reflow at 320px / 200% text', async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:320,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.evaluate(()=>document.documentElement.style.setProperty('--text-scale','2'));
    const opener=f.page.locator('[data-view-item="catalog-index"] [data-focus-key="fact"]');
    await opener.focus(); await f.page.keyboard.press('Enter');
    const section=f.page.locator('[data-view-item="entry:fact"]');
    assert.ok(await section.isVisible());
    await section.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'known',exact:true}).click();
    const overflow=await f.page.evaluate(()=>[...document.querySelectorAll('body *')]
      .filter(element=>element.checkVisibility()&&element.getBoundingClientRect().right>innerWidth+1)
      .slice(0,12).map(element=>({tag:element.tagName,text:element.textContent?.slice(0,90),bounds:element.getBoundingClientRect().toJSON()})));
    assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(overflow));
    await mkdir('artifacts/ui-stabilization-v119/bank',{recursive:true});
    await f.page.screenshot({path:'artifacts/ui-stabilization-v119/bank/inspector-320-200.png'});
    await f.page.getByRole('button',{name:'Back',exact:true}).click();
    assert.ok(await opener.evaluate(element=>element===document.activeElement));
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});

test('media bank states mount the real owners with isolated installed artwork and no product commands', async () => {
  const f=await svelteBrowser(`<script>
    import PublicCatalogBank from './src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte';
    let show=$state(false); const surface=${JSON.stringify(surface)};
  </script><button onclick={()=>show=true}>Mount bank</button>
  {#if show}<PublicCatalogBank {surface} oncatalog={()=>{}} />{/if}`,{},'http://bank-fixture.test/');
  try {
    const mutations:string[]=[];
    f.page.on('request',request=>{if(request.method()!=='GET') mutations.push(request.url());});
    const artwork=await readFile(new URL('../src/build/svelte/template/static/bank-image.svg',import.meta.url));
    await f.page.route('**/bank-image.svg',route=>route.fulfill({contentType:'image/svg+xml',body:artwork}));
    await f.page.addStyleTag({content:await rendererCss()});
    await f.page.getByRole('button',{name:'Mount bank',exact:true}).click();
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="collection"]').click();
    const selectState=async (entry:string,state:string)=>{
      await f.page.locator(`[data-view-item="entry:${entry}"]`).getByRole('button',{name:/^State ·/}).click();
      await f.page.getByRole('option',{name:state,exact:true}).click();
    };
    for(const state of ['media-grid','media-list','collection-grid']) {
      await selectState('collection',state);
      const specimen=f.page.locator(`[data-view-item="specimen:collection:${state}"]`);
      if(state==='collection-grid') {
        assert.equal(await specimen.locator('[data-media-collection-grid]').count(),1);
        assert.equal(await specimen.locator('[data-media-collection-card]').count(),2);
      } else {
        assert.equal(await specimen.locator(`[data-media-layout="${state==='media-list'?'list':'grid'}"]`).count(),1);
        assert.equal(await specimen.locator('[data-media-grid-item]').count(),3);
      }
      await specimen.locator('img').first().evaluate(async image=>{await (image as HTMLImageElement).decode();});
    }
    await f.page.getByRole('button',{name:'Back',exact:true}).click();
    await f.page.locator('[data-view-item="catalog-index"] [data-focus-key="context"]').click();
    await selectState('context','media-object');
    const media=f.page.locator('[data-view-item="specimen:context:media-object"] [data-media-object]');
    assert.equal(await media.count(),1);
    await media.locator('img').first().evaluate(async image=>{await (image as HTMLImageElement).decode();});
    assert.deepEqual(mutations,[]);
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
