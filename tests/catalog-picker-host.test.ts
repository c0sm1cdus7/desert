import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { compilePublicCatalog } from "../src/public-catalog/compile.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { travelKit } from "../products/landmarks/exercises.ts";

const definition = catalogFixture();
const surface = compilePublicCatalog({ ...definition, exercises: travelKit, source: { ...definition.source,
  assets: [...definition.source.assets, {id:'thumb-1016',path:'media/fuji.jpg',alt:'Mount Fuji'}],
  records: [...definition.source.records, {id:'1016',image:'thumb-1016',facts:{name:'Mount Fuji',story:'A mountain.',region:'north',privateMemo:''}}],
} }).surface;
const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/explorer/CatalogWorkspace.svelte';
  const surface = ${JSON.stringify(surface)};
</script>
<div data-embedded-catalog style="width:320px">
  <CatalogWorkspace navigationSurface={{title:'Landmarks',settingsPlaceholder:true}} title="Travel kit" active="travel-kit"
    identity={{title:'Travel kit',subtitle:'Plan your next visit.'}}
    navigation={[{id:'browse',label:'Landmarks'},{id:'travel-kit',label:'Travel kit'},{id:'bank',label:'Component bank'}]}
    query="" searching={false} onquery={()=>{}} onnavigate={()=>{}} onsearch={()=>{}} oncancel={()=>{}}
    content={{kind:'public-catalog',surface,projected:surface.home,active:'travel-kit',selected:null,
      bankVisited:false,onevent:()=>{},onactions:()=>{}}} />
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
