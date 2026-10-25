import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";
import { pixelDifference } from "./fixtures/pixel-difference.ts";
import { catalogWorkspaceBefore } from "./fixtures/catalog-workspace-before.ts";

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource()}
</script>
<CatalogWorkspace documentTitle="Notes · Notebook" navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes" identity={{title:'Notes',subtitle:'Your writing'}}
  navigation={[{id:'notes',label:'Notes',icon:'create'}]} active="notes" query="" searching={false} onsearch={()=>{}} oncancel={()=>{}}
  onquery={()=>{}} onnavigate={()=>{}} content={workspaceBody} />`;

test("correcting pane landmark semantics leaves navigation, headings and toolbar pixels unchanged", { timeout: 60000 }, async () => {
  const paths = ["src/svelte/catalog/compositions/toolbar-layout/ToolbarLayout.svelte", "src/svelte/catalog/foundations/place-heading/PlaceHeading.svelte",
    "src/svelte/catalog/foundations/place/Place.svelte", "src/svelte/catalog/compositions/catalog-navigation/CatalogNavigation.svelte"];
  // The baseline is the pre-shell workspace (frozen, with its navigation pane) before the landmark correction; the candidate
  // is today's workspace on the shell, whose navigation pane and bars carry the corrected landmarks.
  const before: Record<string,string> = { ...catalogWorkspaceBefore };
  for (const path of paths) {
    const current = catalogWorkspaceBefore[resolve(path)] ?? await readFile(path, 'utf8');
    let previous = current;
    if (path.endsWith('ToolbarLayout.svelte')) previous = current.replace('<div bind:this={element} class={edge', '<header bind:this={element} class={edge').replace(/<\/div>\s*$/, '</header>');
    else if (path.endsWith('PlaceHeading.svelte')) previous = current.replace('<div class="place-heading-content"', '<header class="place-heading-content"').replace('</div>\n{:else}', '</header>\n{:else}');
    else if (path.endsWith('Place.svelte')) previous = current.replace('role={landmark}', 'role={landmark === "main" ? "main" : undefined}');
    else previous = current.replace('<Place landmark="navigation" label="Main navigation">', '<Place landmark="navigation">')
      .replace('    <div>\n', '    <nav aria-label="Main navigation">\n').replace('    </div>\n', '    </nav>\n');
    assert.notEqual(previous, current, path);
    before[resolve(path)] = previous;
  }
  const baseline = await svelteBrowser(source, before), candidate = await svelteBrowser(source);
  try {
    const css = await rendererCss(Object.values(catalogWorkspaceBefore));
    for (const f of [baseline,candidate]) {
      await f.page.addStyleTag({content:css});
      await f.page.emulateMedia({reducedMotion:'reduce'});
    }
    // The frozen workspace's :global host rule, re-added last as a build orders it (see shell-foundation.test.ts).
    await baseline.page.addStyleTag({ content: "[data-catalog-workspace] [data-adaptive-host] { position:absolute; inset:0; }" });
    for (const width of [390,1280]) for (const dark of [false,true]) {
      for (const f of [baseline,candidate]) {
        await f.page.setViewportSize({width,height:800});
        await f.page.evaluate(dark => document.documentElement.classList.toggle('dark',dark), dark);
        await f.page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));});
      }
      // Action's Icon draws the bar glyphs the vendor buttons drew (antialiasing within 6 levels; see shell-foundation.test.ts).
      const [after, previous] = [await candidate.page.screenshot(), await baseline.page.screenshot()];
      assert.deepEqual(await pixelDifference(candidate.page, after, previous, 8), { count: 0, within: true }, `${width}/${dark} pixels`);
    }
    assert.deepEqual(baseline.errors, []); assert.deepEqual(candidate.errors, []);
  } finally { await baseline.close(); await candidate.close(); }
});
