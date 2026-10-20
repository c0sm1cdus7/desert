import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import SurfaceFrame from '@desert/svelte/SurfaceFrame.svelte';
  import Problem from '@desert/svelte/pieces/Problem.svelte';
  import CatalogWorkspace from '@desert/svelte/explorer/CatalogWorkspace.svelte';
  let open = $state(false);
  const frame = {version:'desert.surface-frame/6',kind:'message',
    top:{title:'Persistent message',face:{kind:'status',severity:'warning'}},
    content:{kind:'message',text:'This is a renderer fixture, not a product failure.'},bottom:{}};
</script>
<Problem {open} title="Transient message" description="This is the same header composition." close={()=>open=false} />
<CatalogWorkspace productName="Places" title="Places" identity={{title:'Places',subtitle:'Explore places.'}}
  navigation={[{id:'browse',label:'Places'}]} active="browse" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}}
  onquery={()=>{}} onnavigate={()=>{}}>
  {#snippet searchResults()}<p>No search results</p>{/snippet}
  <section data-persistent><SurfaceFrame {frame} invoke={()=>{}} /></section>
  <button onclick={()=>open=true}>Open message</button>
</CatalogWorkspace>`;

test("one toolbar owner reaches persistent frames, transient dialogs and the catalog shell", { timeout: 30000 }, async () => {
  const owner = resolve(import.meta.dirname, "../src/svelte/pieces/ToolbarLayout.svelte");
  const original = await readFile(owner, "utf8");
  assert.ok(original.includes('data-piece="toolbar"'));
  const f = await svelteBrowser(source, {
    [owner]: original.replace('data-piece="toolbar"', 'data-piece="toolbar" data-owner-probe="shared"'),
  });
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await f.page.locator('[data-persistent] [data-owner-probe="shared"]').count(), 1);
    assert.equal(await f.page.locator('[data-catalog-toolbar][data-owner-probe="shared"]').count(), 1);
    assert.equal(await f.page.locator('[data-catalog-toolbar] [data-piece="face"]').count(), 0,
      "catalog navigation does not acquire an ornamental face");
    await f.page.getByRole('button', { name: 'Open message', exact: true }).click();
    const dialog = f.page.getByRole('dialog', { name: 'Transient message', exact: true });
    assert.equal(await dialog.locator('[data-toolbar="top"][data-owner-probe="shared"]').count(), 1);
    assert.equal(await dialog.locator('[data-toolbar="bottom"][data-owner-probe="shared"]').count(), 1);
    assert.equal(await dialog.locator('[data-piece="toolbar"]:not([data-owner-probe="shared"])').count(), 0);
    const headers = [f.page.locator('[data-persistent] [data-toolbar="top"]'), dialog.locator('[data-toolbar="top"]')];
    for (const header of headers) {
      assert.equal(await header.locator('[data-toolbar-face] > [data-piece="face"]').count(), 1);
      assert.equal(await header.locator('.toolbar-row [data-piece="face"]').count(), 0);
    }
    await f.page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
