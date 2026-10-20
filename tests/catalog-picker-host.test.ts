import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/explorer/CatalogWorkspace.svelte';
  import LocalExercises from '@desert/svelte/explorer/LocalExercises.svelte';
  import { travelKit as definition } from './products/landmarks/exercises.ts';
</script>
<div data-embedded-catalog style="width:320px">
  <CatalogWorkspace productName="Landmarks" title="Travel kit" active="travel-kit"
    identity={{title:'Travel kit',subtitle:'Plan your next visit.'}}
    navigation={[{id:'browse',label:'Landmarks'},{id:'travel-kit',label:'Travel kit'},{id:'bank',label:'Component bank'}]}
    query="" searching={false} onquery={()=>{}} onnavigate={()=>{}} onsearch={()=>{}} oncancel={()=>{}}>
    {#snippet children()}<LocalExercises {definition} bodyOnly oncatalog={()=>{}} />{/snippet}
    {#snippet searchResults()}<p>No search results</p>{/snippet}
  </CatalogWorkspace>
</div>`;

test('actual catalog exercises inherit their content owner rather than the outer window for picker layout', async () => {
  const f=await svelteBrowser(source);
  try {
    await f.page.setViewportSize({width:1200,height:900});
    await f.page.addStyleTag({content:await rendererCss()});
    assert.deepEqual(f.errors,[]);
    const owner=f.page.locator('[data-catalog-content]');
    assert.equal(Math.round((await owner.boundingBox())!.width),320);
    const date=f.page.getByRole('button',{name:/Arrival date ·/});
    await date.click();await f.page.getByRole('application').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),1,'real catalog date must use its narrow content owner');
    await f.page.keyboard.press('Escape');await f.page.getByRole('application').waitFor({state:'hidden'});
    await f.page.getByRole('button',{name:'Destination · Not selected',exact:true}).click();
    await f.page.getByRole('listbox').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),1,'real catalog select uses the same owner');
    await f.page.getByRole('option',{name:'Mount Fuji',exact:true}).click();
    await f.page.getByRole('listbox').waitFor({state:'hidden'});
    await f.page.locator('[data-embedded-catalog]').evaluate(element=>{(element as HTMLElement).style.width='1100px';});
    await f.page.locator('[data-slot="sidebar-wrapper"][data-presentation="docked"]').waitFor();
    assert.ok((await owner.boundingBox())!.width>672);
    await date.click();await f.page.getByRole('application').waitFor();
    assert.equal(await f.page.locator('[data-picker-sheet]').count(),0,'a sufficiently wide content owner restores anchored presentation');
    assert.deepEqual(f.errors,[]);
  } finally {await f.close();}
});
