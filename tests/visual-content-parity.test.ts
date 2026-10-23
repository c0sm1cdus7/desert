import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import Heading from '@desert/svelte/pieces/Heading.svelte';
  import TextContent from '@desert/svelte/pieces/TextContent.svelte';
  import Information from '@desert/svelte/pieces/Information.svelte';
  let migrated = $state(false);
</script>
<button data-toggle onclick={()=>migrated=!migrated}>Toggle implementation</button>
<main data-parity>
  {#if migrated}
    <Heading kind="page" text="Notes" focusTarget />
    <Heading kind="rail-title" text="Albums" id="albums" />
    <Heading kind="document-title" text="A note" />
    <Heading kind="group-label" text="All notes" required />
    <TextContent text="Exact existing content composition." />
  {:else}
    <h1 class="min-w-0 break-words type-page" data-place-title tabindex="-1">Notes</h1>
    <h2 class="min-w-0 break-words" id="albums" data-catalog-group-title>Albums</h2>
    <h1 class="min-w-0 break-words" data-catalog-detail-title data-place-title tabindex="-1">A note</h1>
    <h2 class="min-w-0 break-words type-caption">All notes<span class="required" aria-hidden="true">*</span></h2>
    <div data-stack-item data-stack-placement="content"><Information items={[{kind:'text',text:'Exact existing content composition.'}]} /></div>
  {/if}
</main>
<style>
  [data-parity] { margin:24px; padding:24px; background:var(--background); color:var(--foreground); }
  [data-catalog-group-title] { margin:0 var(--place-content-inset,42px) 10px; font:var(--text-title--font-weight) var(--text-title)/var(--text-title--line-height) var(--font-sans); }
  [data-catalog-detail-title] { margin:0 0 8px; font:var(--text-title--font-weight) var(--text-page)/var(--text-page--line-height) var(--font-sans); outline:none; }
</style>`;

test("closed semantic headings and text composition preserve exact pixels and geometry", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [390, 1280]) for (const dark of [false, true]) {
      await f.page.setViewportSize({ width, height: 800 });
      await f.page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      await f.page.evaluate(() => document.fonts.ready);
      const target = f.page.locator("[data-parity]");
      const geometry = () => target.locator("h1,h2").evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect(), css = getComputedStyle(node);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: css.font, margin: css.margin };
      }));
      const beforeGeometry = await geometry();
      const before = await target.screenshot();
      await f.page.locator("[data-toggle]").click();
      assert.deepEqual(await geometry(), beforeGeometry, `heading geometry: ${width}/${dark}`);
      assert.deepEqual(await target.screenshot(), before, `pixels: ${width}/${dark}`);
      await f.page.locator("[data-toggle]").click();
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
