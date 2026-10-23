import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/explorer/CatalogWorkspace.svelte';
  ${workspaceBodySource()}
</script>
<CatalogWorkspace navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes" identity={{title:'Notes',subtitle:'Your writing'}}
  navigation={[{id:'notes',label:'Notes',icon:'create'}]} active="notes" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}}
  onquery={()=>{}} onnavigate={()=>{}} content={workspaceBody} />`;

test("correcting pane landmark semantics leaves navigation, headings and toolbar pixels unchanged", { timeout: 60000 }, async () => {
  const paths = ["src/svelte/pieces/ToolbarLayout.svelte", "src/svelte/pieces/PlaceHeading.svelte",
    "src/svelte/pieces/Place.svelte", "src/svelte/explorer/CatalogNavigation.svelte"];
  const before: Record<string,string> = {};
  for (const path of paths) {
    const current = await readFile(path, 'utf8');
    let previous = current;
    if (path.endsWith('ToolbarLayout.svelte')) previous = current.replace('<div bind:this={element} class={edge', '<header bind:this={element} class={edge').replace(/<\/div>\s*$/, '</header>');
    else if (path.endsWith('PlaceHeading.svelte')) previous = current.replace('<div bind:this={element}', '<header bind:this={element}').replace(/<\/div>\s*$/, '</header>');
    else if (path.endsWith('Place.svelte')) previous = current.replace('role={landmark}', 'role={landmark === "main" ? "main" : undefined}');
    else previous = current.replace('<Place landmark="navigation" label="Main navigation">', '<Place landmark="navigation">')
      .replace('    <div>\n', '    <nav aria-label="Main navigation">\n').replace('    </div>\n', '    </nav>\n');
    assert.notEqual(previous, current, path);
    before[resolve(path)] = previous;
  }
  const baseline = await svelteBrowser(source, before), candidate = await svelteBrowser(source);
  try {
    const css = await rendererCss();
    for (const f of [baseline,candidate]) {
      await f.page.addStyleTag({content:css});
      await f.page.emulateMedia({reducedMotion:'reduce'});
    }
    for (const width of [390,1280]) for (const dark of [false,true]) {
      for (const f of [baseline,candidate]) {
        await f.page.setViewportSize({width,height:800});
        await f.page.evaluate(dark => document.documentElement.classList.toggle('dark',dark), dark);
        await f.page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));});
      }
      assert.deepEqual(await candidate.page.screenshot(), await baseline.page.screenshot(), `${width}/${dark} pixels`);
    }
    assert.deepEqual(baseline.errors, []); assert.deepEqual(candidate.errors, []);
  } finally { await baseline.close(); await candidate.close(); }
});
