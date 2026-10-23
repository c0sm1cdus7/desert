import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogBankInventory } from '../src/svelte/infra/PublicCatalogBank-model.ts';
import { compilePublicCatalog } from '../src/public-catalog/index.ts';
import { ControlBank } from '../src/interaction/control-bank.ts';
import { catalogFixture } from './fixtures/public-catalog.ts';
import { svelteBrowser } from './fixtures/svelte-browser.ts';
import { rendererCss } from './fixtures/renderer-css.ts';
import { catalogWorkspaceSource } from './fixtures/catalog-workspace.ts';

test('connection examples use real action and collection states and preserve offline writing',()=>{
  const examples=publicCatalogBankInventory(compilePublicCatalog(catalogFixture()).surface);
  const example=(id:string,state:string)=>examples.find(item=>item.id===id&&item.state===state)?.node;
  const loading=example('action','loading'),offline=example('action','offline');
  assert.equal(loading?.kind,'action'); assert.equal(offline?.kind,'action');
  if(loading?.kind==='action'&&offline?.kind==='action') {
    assert.equal(loading.action.state,'pending'); assert.match(loading.action.reason!,/connect/i);
    assert.equal(offline.action.state,'unavailable'); assert.match(offline.action.reason!,/offline/i);
  }
  for(const state of ['loading','offline']) {
    const collection=example('collection',state);
    assert.equal(collection?.kind,'collection');
    if(collection?.kind==='collection') assert.equal(collection.connection,state);
  }
  const writing=example('input.text','offline');
  assert.equal(writing?.kind,'input.text');
  if(writing?.kind==='input.text') {assert.equal(writing.disabled,false);assert.ok(writing.value.length>0);}
  for(const id of ['control.select','control.options','control.money','control.date','control.files','control.labels']) {
    const entry=ControlBank.find(item=>item.id===id)!;
    assert.ok(entry.specimens.some(specimen=>specimen.state==='loading'),id);
    assert.ok(entry.specimens.some(specimen=>specimen.state==='offline'),id);
  }
});

test('action-row connection state explains disabled commands without executing them',async()=>{
  const f=await svelteBrowser(catalogWorkspaceSource,{},undefined,{initialCss:await rendererCss()});
  try {
    await f.page.locator('[data-catalog-index] [data-destination="ViewDestinationLink"]').click();
    const specimen=f.page.locator('[data-owner-specimen="ViewDestinationLink"]');
    await specimen.getByRole('button',{name:/^State ·/}).click();
    await f.page.getByRole('option',{name:'Offline',exact:true}).click();
    const row=specimen.getByRole('button',{name:'Trash',exact:true});
    assert.ok(await row.isDisabled());
    const description = await row.getAttribute('aria-describedby');
    assert.ok(description, 'unavailable action references its accessible explanation');
    assert.match((await f.page.locator(`[id="${description}"]`).textContent())!,/offline/i);
    assert.ok(await specimen.getByRole('status').getByText(/offline/i).isVisible());
    await row.evaluate(element=>(element as HTMLButtonElement).click());
    assert.equal(await specimen.getByText('Open Trash from content, not the toolbar.').count(),0);
    assert.deepEqual(f.errors,[]);
  }finally{await f.close();}
});
