import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";
import AxeBuilder from "@axe-core/playwright";

const source = `<script lang="ts">
  import SurfaceFrame from '@desert/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte';
  import Problem from '@desert/svelte/catalog/compositions/problem/Problem.svelte';
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource()}
  let open = $state(false);
  const frame = {version:'desert.surface-frame/6',kind:'message',
    top:{title:'Persistent message',face:{kind:'status',severity:'warning'}},
    content:{kind:'message',text:'This is a renderer fixture, not a product failure.'},bottom:{}};
</script>
<Problem {open} title="Transient message" description="This is the same header composition." close={()=>open=false} />
<CatalogWorkspace navigationSurface={{title:'Places',settingsPlaceholder:true}} title="Places" identity={{title:'Places',subtitle:'Explore places.'}}
  navigation={[{id:'browse',label:'Places'}]} active="browse" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}}
  onquery={()=>{}} onnavigate={()=>{}} content={workspaceBody}
  topActions={[{label:'Open message',icon:'open',state:'ready',intent:{kind:'view.output',view:'fixture',output:'open'}}]}
  invoke={()=>open=true} />
<section aria-label="Persistent message fixture" data-persistent style="position:fixed;top:10rem;left:2rem;z-index:1;pointer-events:none">
  <SurfaceFrame {frame} invoke={()=>{}} />
</section>`;

test("one toolbar owner reaches persistent frames, transient dialogs and the catalog shell", { timeout: 30000 }, async () => {
  const owner = resolve(import.meta.dirname, "../src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte");
  const original = await readFile(owner, "utf8");
  assert.ok(original.includes('data-piece="toolbar"'));
  // The workspace's bars are the Bar foundation's (lane F, on the shell); frames and dialogs keep ToolbarLayout until they
  // move to Bar too (lane E). Each owner is probed: one draws the catalog shell's rails, the other every frame's.
  const bar = resolve(import.meta.dirname, "../src/svelte/catalog/foundations/bar/Bar.svelte");
  const barSource = await readFile(bar, "utf8");
  assert.ok(barSource.includes('data-piece="toolbar"'));
  const f = await svelteBrowser(source, {
    [owner]: original.replace('data-piece="toolbar"', 'data-piece="toolbar" data-owner-probe="shared"'),
    [bar]: barSource.replace('data-piece="toolbar"', 'data-piece="toolbar" data-owner-probe="bar"'),
  });
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    const navigation = f.page.getByRole('navigation', { name: 'Main navigation', exact: true });
    assert.equal(await navigation.count(), 1, "the whole navigation surface is one landmark");
    assert.equal(await navigation.locator('[data-toolbar="top"]').count(), 1, "navigation chrome belongs to its landmark");
    assert.equal(await navigation.getByRole('button', {name:'Hide navigation', exact:true}).count(), 1);
    assert.equal(await navigation.locator('[data-toolbar="bottom"]').count(), 2,
      "the navigation return and this fixture's optional settings toolbar belong to the same landmark");
    assert.deepEqual((await new AxeBuilder({ page: f.page }).withRules(['landmark-banner-is-top-level', 'landmark-unique', 'region']).analyze()).violations, []);
    assert.equal(await f.page.locator('[data-persistent] [data-owner-probe="shared"]').count(), 1);
    assert.equal(await f.page.locator('[data-catalog-toolbar][data-owner-probe="bar"]').count(), 1);
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
