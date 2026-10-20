import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from "@desert/svelte/explorer/CatalogWorkspace.svelte";
  import BankRenderer from "@desert/svelte/BankRenderer.svelte";
  let query = $state(''), events = $state([]), searching = $state(false);
  const image = {asset:'mountain',alt:'Mountain above a forest'};
  const node = {version:'desert.bank-node/1',kind:'catalog.home',featured:{version:'desert.bank-node/1',kind:'catalog.card',
    presentation:'featured',record:'mountain',title:'Mountain',image,eyebrow:'Featured place',actionLabel:'Learn More'},
    groups:[{id:'places',title:'Places',items:[{version:'desert.bank-node/1',kind:'catalog.card',presentation:'item',record:'mountain',title:'Mountain',image}]}]};
</script>
<CatalogWorkspace productName="Explorer" title="Explorer" identity={{title:'Explorer',subtitle:'Explore places.'}}
  navigation={[{id:'browse',label:'Explore'},{id:'travel-kit',label:'Travel kit'}]} active="browse"
  {searching} onsearch={()=>searching=true} oncancel={()=>searching=false}
  {query} onquery={value => query = value} onnavigate={id => events = [...events,id]}>
  {#snippet searchResults()}<p>No search results</p>{/snippet}
  <BankRenderer {node} onevent={event => events = [...events,event]} />
</CatalogWorkspace>
<output hidden data-events>{JSON.stringify(events)}</output>`;

test("catalog composes real shadcn owners and emits one typed destination event", { timeout: 20000 }, async () => {
  // This harness checks semantics, not stylesheet fidelity (the built-app gate owns that).
  const workspace = resolve(import.meta.dirname, "../src/svelte/explorer/CatalogWorkspace.svelte");
  const component = (await readFile(workspace, "utf8")).replace(/^\s*import "\.\/catalog-[^"]+\.css";$/gm, "");
  const f = await svelteBrowser(source, { [workspace]: component });
  try {
    assert.deepEqual(f.errors, []);
    await f.page.setViewportSize({ width: 900, height: 450 });
    await f.page.addStyleTag({ content: await rendererCss() });
    assert.equal(await f.page.locator('[data-slot="sidebar-wrapper"]').count(), 1);
    assert.equal(await f.page.locator('[data-slot="card"]').count(), 2);
    assert.equal(await f.page.locator('button button, a button, button a').count(), 0);
    assert.equal(await f.page.getByRole('heading', {name:'Mountain',exact:true}).count(), 0, 'cards do not introduce a second place title');
    assert.equal(await f.page.getByRole('button', {name:'Mountain',exact:true}).count(), 2);
    assert.equal(await f.page.getByRole('button', {name:'Learn More',exact:true}).count(), 0, 'legacy featured cards do not recreate the removed hero CTA');
    await f.page.getByRole('button', {name:'Mountain',exact:true}).first().click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent() ?? ''), [{kind:'catalog.open',record:'mountain'}]);
    await f.page.getByRole('button', {name:'Search',exact:true}).click();
    await f.page.getByRole('searchbox', {name:'Search explorer'}).fill('forest');
    assert.equal(await f.page.getByRole('searchbox').inputValue(), 'forest');
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("compact sidebar navigation closes its genuine sheet after choosing a destination", { timeout: 20000 }, async () => {
  const workspace = resolve(import.meta.dirname, "../src/svelte/explorer/CatalogWorkspace.svelte");
  const component = (await readFile(workspace, "utf8")).replace(/^\s*import "\.\/catalog-[^"]+\.css";$/gm, "");
  const f = await svelteBrowser(source, { [workspace]: component });
  try {
    assert.deepEqual(f.errors, []);
    await f.page.setViewportSize({ width: 390, height: 844 });
    // Capacity is measured from the real host and CSS geometry, not device width.
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.getByRole('button', {name:'Show navigation',exact:true}).click();
    const sheet = f.page.getByRole('dialog', {name:'Navigation',exact:true});
    await sheet.waitFor();
    await sheet.getByRole('button', {name:'Travel kit',exact:true}).click();
    await sheet.waitFor({state:'hidden'});
    assert.deepEqual(JSON.parse(await f.page.locator('[data-events]').textContent() ?? ''), ['travel-kit']);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
