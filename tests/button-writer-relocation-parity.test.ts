import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { buttonWritersBefore } from "./fixtures/button-writers-before.ts";
import { controlWritersBefore } from "./fixtures/control-writers-before.ts";
import { buttonGlobalsBefore } from "./fixtures/button-globals-before.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { catalogWorkspaceBefore } from "./fixtures/catalog-workspace-before.ts";

// The search toolbar this test hosts its buttons in was a catalog-workspace part; it is frozen since the shell replaced it.
const catalogToolbar = resolve("src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte");

const buttonPath = "src/svelte/vendor/components/ui/button/button.svelte";
const source = `<script lang="ts">
  import { Button } from '@desert/svelte/vendor/components/ui/button/index.js';
  import Toolbar from '@desert/svelte/catalog/compositions/toolbar/Toolbar.svelte';
  import CatalogToolbar from './src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte';
  import * as Sidebar from '@desert/svelte/vendor/components/ui/sidebar/index.js';
  let query=$state(''),searching=$state(false);
  const cssBeforeMount=!!document.querySelector('[data-fixture-initial-css]');
  const actions=[{intent:{kind:'journey',journey:'edit'},label:'Edit',icon:'edit',state:'ready'},
    {intent:{kind:'journey',journey:'archive'},label:'Archive',icon:'archive',state:'ready'}];
</script>
<main data-renderer-profile="apple-reference" data-catalog-workspace data-css-before-mount={cssBeforeMount}>
  <Sidebar.Provider>
    <CatalogToolbar title="Notes" {query} {searching} resultsId="results" onquery={value=>query=value}
      onsearch={()=>searching=true} oncancel={()=>{searching=false;query='';}}/>
    <div data-catalog-scroll>
      <Toolbar toolbar={{edge:'top',title:'Shared toolbar',subtitle:'One button owner',trailing:actions}} invoke={()=>{}}/>
      <section aria-label="Button states">
        <Button>Save note</Button><Button variant="outline">Close</Button>
        <Button variant="destructive">Delete</Button><Button disabled>Unavailable</Button>
        <Button variant="row">A readable row with a longer label</Button>
        <Button href="#results" variant="ghost">View results</Button>
      </section>
      <section id="results" aria-label="Search results"><p>Writing remains visible.</p></section>
    </div>
  </Sidebar.Provider>
</main>`;

// The eight rules the theme and the catalog-search mechanism once wrote for the button (frozen), and where the button
// keeps each one today: scoped to the elements it draws, never :global. Each search glyph sits in its own box (it was
// the glyph itself), and the open glyph follows the button's own searching mark (it followed the search actions'
// expanded state, which is the same fact the toolbar passes as `searching`).
const relocated = [
  ['[data-slot="button"]', '[data-slot="button"]'], ['[data-button-content]', '[data-button-content]'],
  ['[data-catalog-search-toggle]', '[data-catalog-search-toggle]'],
  ['[data-catalog-search-toggle] [data-button-content]', '[data-catalog-search-toggle] [data-button-content]'],
  ['[data-catalog-search-toggle] svg', '[data-search-icon]'],
  ['[data-catalog-search-toggle] [data-search-icon="close"]', '[data-search-icon="close"]'],
  ['[data-catalog-search-actions][data-expanded="true"] [data-search-icon="open"]', '[data-catalog-search-cancel] [data-search-icon="open"]'],
  ['[data-catalog-search-actions][data-expanded="true"] [data-search-icon="close"]', '[data-catalog-search-cancel] [data-search-icon="close"]'],
] as const;
const barTargetBefore = `
[data-piece="toolbar"] .toolbar-row :is([data-slot="button"],[data-slot="sidebar-trigger"]):not([data-media-thumbs] button) { height:var(--toolbar-target); min-height:var(--toolbar-target); }
[data-piece="toolbar"] .toolbar-row :is(.toolbar-action > button,[data-toolbar-controls] button,[data-catalog-navigation-actions] > button,[data-slot="sidebar-trigger"],[data-catalog-search-toggle],button:has(> [data-button-content] > svg):not([data-action])) { width:var(--toolbar-target); flex-shrink:0; padding:var(--toolbar-inset); }
[data-piece="toolbar"][data-toolbar-purpose="commit"] > .toolbar-row > * { flex:0 1 auto; min-width:0; }
[data-piece="toolbar"][data-toolbar-purpose="commit"] button { white-space:nowrap; }
[data-piece="toolbar"][data-toolbar-purpose="steps"] > .toolbar-row > button { width:100%; max-width:none; min-width:0; }`;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const declarations = (css: string, selector: string) => css.match(new RegExp(`(?:^|[{}]|\\*\\/)\\s*${escape(selector)}\\s*\\{([^{}]*)\\}`))?.[1]?.replace(/\s+/g, "");
const styleOf = (svelte: string) => svelte.match(/<style>([\s\S]*?)<\/style>/)![1]!;

test("the button's rules are its own: scoped to what it draws, with the frozen declarations and their layering", async () => {
  const style = styleOf(await readFile(buttonPath, "utf8"));
  assert.doesNotMatch(style, /:global/, "no rule of the button styles outside its component");
  const frozen = buttonWritersBefore["src/svelte/theme.css"] + controlWritersBefore["src/svelte/catalog/mechanisms/catalog-search/catalog-search.css"];
  for (const [before, after] of relocated) {
    const original = declarations(frozen, before), today = declarations(style, after);
    assert.ok(original, `${before} existed in the frozen ownership snapshot`);
    // The glyph's box lays its glyph out without a line box of its own, so it sits where the glyph sat.
    assert.equal(today, before === '[data-catalog-search-toggle] svg' ? `display:flex;${original}` : original, `${after} exact declarations`);
  }
  assert.match(style, /@layer components\s*\{\s*\[data-slot="button"\]\s*\{[^{}]*\}\s*\[data-button-content\]\s*\{[^{}]*\}\s*\}/,
    "geometry remains in components");
  assert.match(style, /gap:inherit;\s*\}\s*\}\s*\[data-catalog-search-toggle\]/, "search rules retain their original unlayered cascade");
  // The a2d02f5 button wrote the same rules as :global ones (the base every other owner of a content span relied on).
  const globals = styleOf(buttonGlobalsBefore);
  for (const [, after] of relocated.slice(0, 4)) assert.ok(declarations(globals.replace(/:global\(([^)]+)\)/g, "$1"), after), `${after} was a global rule`);
});

test("moving the button's rules into its own scope keeps the computed geometry and motion in one DOM", { timeout: 90000 }, async () => {
  const css = await rendererCss();
  const capture = async (version: "before" | "after") => {
    const overrides: Record<string, string> = { [catalogToolbar]: catalogWorkspaceBefore[catalogToolbar]! };
    if (version === "before") overrides[resolve(buttonPath)] = buttonGlobalsBefore;
    // The a2d02f5 button took a bar's target from bar.css, which named the button; today a bar's Action carries its typed
    // placement, which the frozen button cannot read, so its side brings the bar rules it was drawn with.
    const fixture = await svelteBrowser(source, overrides, undefined, { initialCss: version === "before" ? `${css}\n${barTargetBefore}` : css });
    const states: Record<string, unknown> = {};
    try {
      const { page } = fixture;
      assert.equal(await page.locator('main').getAttribute('data-css-before-mount'), 'true');
      const settle = () => page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        await Promise.all(document.getAnimations().filter(animation => {
          const end = animation.effect?.getComputedTiming().endTime;
          return typeof end === 'number' && Number.isFinite(end);
        }).map(animation => animation.finished.catch(() => {})));
        await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      });
      const geometry = () => page.locator('[data-slot="button"],[data-button-content],[data-search-field]').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(element);
        return { bounds: element.getBoundingClientRect().toJSON(), textBounds: range.getBoundingClientRect().toJSON(),
          minHeight: style.minHeight, position: style.position, display: style.display, width: style.width, minWidth: style.minWidth,
          direction: style.flexDirection, align: style.alignItems, justify: style.justifyContent, gap: style.gap, font: style.font,
          color: style.color, background: style.background, border: style.border, shadow: style.boxShadow, transform: style.transform,
          transition: style.transition, outline: style.outline, outlineOffset: style.outlineOffset };
      }));
      // Each search glyph, by its own box (before: the glyph; after: the box around it), and the button around it.
      const glyphs = () => page.locator('[data-search-icon]').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element), box = element.getBoundingClientRect().toJSON();
        return { box, transition: style.transition, transform: style.transform, opacity: style.opacity, grid: style.gridArea };
      }));
      for (const width of [390, 1280]) for (const colorScheme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        const label = `${width}/${colorScheme}`;
        await settle(); states[`${label}/closed`] = [await geometry(), await glyphs()];
        await page.getByRole("button", { name: "Search", exact: true }).click();
        await page.getByRole("searchbox").fill("A shared query");
        await settle(); states[`${label}/search-writing`] = [await geometry(), await glyphs()];
        await page.getByRole("button", { name: "Clear search", exact: true }).click();
        await settle(); states[`${label}/search-cleared`] = [await geometry(), await glyphs()];
        await page.getByRole("button", { name: "Close search", exact: true }).click();
      }
      for (const reducedMotion of ["no-preference", "reduce"] as const) {
        await page.emulateMedia({ reducedMotion }); await settle();
        states[`motion/${reducedMotion}`] = await page.locator('[data-slot="button"],[data-button-content]').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return { transition: style.transition, transform: style.transform, opacity: style.opacity, shadow: style.boxShadow };
        }));
      }
      assert.deepEqual(fixture.errors, []);
    } finally { await fixture.close(); }
    return states;
  };
  const before = await capture("before"), after = await capture("after");
  for (const state of Object.keys(before)) assert.deepEqual(after[state], before[state], `${state}: computed geometry, paint and motion`);
});
