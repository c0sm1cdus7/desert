import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { squareCorners } from "./fixtures/curvature-family.ts";
import { navigationFacesAside } from "./fixtures/navigation-face.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss, themeBeforePrune } from "./fixtures/renderer-css.ts";
import { prunedSourcesBefore } from "./fixtures/pruned-sources-before.ts";
import { workspaceOwnerRulesBefore } from "./fixtures/workspace-owner-rules-before.ts";
import { buttonGlobalsBefore } from "./fixtures/button-globals-before.ts";
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
    // Batch 3 deleted toolbar-layout, place and catalog-navigation: their f7247e4 sources.
    const current = catalogWorkspaceBefore[resolve(path)] ?? prunedSourcesBefore[path] ?? await readFile(path, 'utf8');
    let previous = current;
    if (path.endsWith('ToolbarLayout.svelte')) previous = current.replace('<div bind:this={element} class={edge', '<header bind:this={element} class={edge').replace(/<\/div>\s*$/, '</header>');
    else if (path.endsWith('PlaceHeading.svelte')) previous = current.replace('<div class="place-heading-content"', '<header class="place-heading-content"').replace('</div>\n{:else}', '</header>\n{:else}');
    else if (path.endsWith('Place.svelte')) previous = current.replace('role={landmark}', 'role={landmark === "main" ? "main" : undefined}');
    else previous = current.replace('<Place landmark="navigation" label="Main navigation">', '<Place landmark="navigation">')
      .replace('    <div>\n', '    <nav aria-label="Main navigation">\n').replace('    </div>\n', '    </nav>\n');
    assert.notEqual(previous, current, path);
    before[resolve(path)] = previous;
  }
  // The frozen side mounts the vendor button as it stood with its :global rules (the base the frozen rows were laid out by).
  before[resolve("src/svelte/vendor/components/ui/button/button.svelte")] = buttonGlobalsBefore;
  const baseline = await svelteBrowser(source, before), candidate = await svelteBrowser(source);
  try {
    // Each side draws with its own stylesheets: the frozen workspace with the base f7247e4 theme, today's with today's.
    const frozen = Object.values(before);
    const sheets = [await rendererCss(frozen, themeBeforePrune()), await rendererCss(frozen)];
    for (const [index, f] of [baseline,candidate].entries()) {
      await f.page.addStyleTag({content:sheets[index] ?? ""});
      await f.page.emulateMedia({reducedMotion:'reduce'});
    }
    // The frozen workspace's :global host rule, re-added last as a build orders it (see shell-foundation.test.ts).
    // The frozen workspace still draws the old marks the shell, field, bar and icon no longer style: it brings their rules.
    await baseline.page.addStyleTag({ content: workspaceOwnerRulesBefore });
    await baseline.page.addStyleTag({ content: "[data-catalog-workspace] [data-adaptive-host] { position:absolute; inset:0; }" });
    // Design §7.1 radius exception (law 9d): both sides square their corners; tests/curvature-family.test.ts owns them.
    for (const f of [baseline, candidate]) await f.page.addStyleTag({ content: squareCorners });
    // Owner decision V1 (law 9e): the destination icons are the one Face now; tests/navigation-face.test.ts owns them.
    for (const f of [baseline, candidate]) await f.page.addStyleTag({ content: navigationFacesAside });
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
