// Shell (slice 3, F1.9, DESIGN §3.2): the workspace foundation built from the catalog-workspace composition. Composed
// with Bar, PlaceHeading and the workspace content, it draws what CatalogWorkspace drew; its instance replaces the
// viewport callbacks; search focus, Escape and the navigation pane work as before.
import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";
import { pixelDifference } from "./fixtures/pixel-difference.ts";
import { catalogWorkspaceBefore } from "./fixtures/catalog-workspace-before.ts";

const content = [{ kind: "header", id: "heading", title: "Notes", subtitle: "Your writing" },
  { kind: "stack", id: "plans", title: "Plans", items: Array.from({ length: 30 }, (_, index) => ({ kind: "text" as const, text: `Plan line ${index}.` })) },
  { kind: "stack", id: "archive", title: "Archive", items: [{ kind: "text", text: "Last year." }] }] as const;

// The pre-shell workspace, frozen (fixtures/catalog-workspace-before.ts): today's CatalogWorkspace is itself mounted on Shell.
const before = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource(content)}
</script>
<CatalogWorkspace navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes" identity={{title:'Notes',subtitle:'Your writing'}}
  navigation={[{id:'notes',label:'Notes',icon:'create'},{id:'trash',label:'Trash',icon:'archive'}]} active="notes" query="" searching={false}
  onsearch={()=>{}} oncancel={()=>{}} onquery={()=>{}} onnavigate={()=>{}} content={workspaceBody} />`;

const after = `<script lang="ts">
  import Shell from '@desert/svelte/catalog/foundations/shell/Shell.svelte';
  import Bar from '@desert/svelte/catalog/foundations/bar/Bar.svelte';
  import PlaceHeading from '@desert/svelte/catalog/foundations/place-heading/PlaceHeading.svelte';
  import CatalogWorkspaceContent from '@desert/svelte/catalog/compositions/catalog-workspace-content/CatalogWorkspaceContent.svelte';
  import { workspaceNavigation } from '@desert/svelte/infra/workspace-navigation.ts';
  ${workspaceBodySource(content)}
  const groups = workspaceNavigation([{id:'notes',label:'Notes',icon:'create'},{id:'trash',label:'Trash',icon:'archive'}]);
  let active = $state('notes'), searching = $state(false), query = $state(''), events = $state<string[]>([]);
  const navigation = $derived({ identity: { title: 'Notebook' }, settingsPlaceholder: true, active, groups });
  let shell = $state<{ scrollTop(): number; scrollToTop(): void; focusTitle(): void; revealItem(id: string): Promise<boolean>;
    scrollPositions(): { content: number; search: number }; restoreScroll(content: number, search: number): void;
    focus(key: string): boolean; toggleNavigation(): void; focusContent(): void } | undefined>();
  Reflect.set(window, 'shell', () => shell);
  Reflect.set(window, 'events', () => events);
</script>
<Shell bind:this={shell} documentTitle="Notes · Notebook" label="Notes" destination={active} {searching} hasQuery={query.trim() !== ''}
  detail={false} backAvailable resultsId="notes-results" searchLabel="Search in Notes" {navigation}
  onnavigate={id => { active = id; events = [...events, 'navigate:' + id]; }} oncancelsearch={restore => { searching = false; events = [...events, 'cancel:' + restore]; }}>
  {#snippet top()}
    <Bar edge="top" purpose="commands" layer="content" inert={searching} identity={{title:'Notes',subtitle:'Your writing'}} identityRole="continuation"
      trailing={[]} search={{title:'Notes',query,open:searching,resultsId:'notes-results'}} settingsPlaceholder={false} />
    <Bar edge="top" purpose="commands" layer="search" identityRole="heading" trailing={[]} search={{title:'Notes',query,open:searching,resultsId:'notes-results'}}
      settingsPlaceholder={false} inert={false} onsearchopen={() => searching = true} onsearchcancel={() => searching = false} onquery={value => query = value} />
  {/snippet}
  {#snippet content()}
    <PlaceHeading context="place" title="Notes" subtitle="Your writing" /><CatalogWorkspaceContent content={workspaceBody} {searching} />
  {/snippet}
  {#snippet search()}<button type="button" onclick={() => { events = [...events, 'select:first']; }}>Plan line 1.</button>{/snippet}
</Shell>`;

/** Pixel equality of the two pages; SHELL_SHOTS keeps both screenshots for inspection. */
async function compare(candidate: Awaited<ReturnType<typeof svelteBrowser>>, baseline: Awaited<ReturnType<typeof svelteBrowser>>, name: string) {
  const [after, before] = [await candidate.page.screenshot(), await baseline.page.screenshot()];
  // The navigation toggles and the search toggle draw their glyphs through Action's Icon (antialiasing within 6 levels);
  // the backdrop blur rasterises within 1. Any moved or resized box exceeds the tolerance.
  assert.deepEqual(await pixelDifference(candidate.page, after, before, 8), { count: 0, within: true }, `${name}: same pixels`);
}

const settle = (page: Awaited<ReturnType<typeof svelteBrowser>>["page"]) => page.evaluate(async () => {
  await document.fonts.ready;
  for (let frame = 0; frame < 6; frame++) await new Promise(done => requestAnimationFrame(done));
});

test("composed with bars and the place heading, the shell draws the catalog workspace's pixels", { timeout: 120000 }, async () => {
  const [baseline, candidate] = [await svelteBrowser(before, catalogWorkspaceBefore), await svelteBrowser(after)];
  try {
    const css = await rendererCss(Object.values(catalogWorkspaceBefore));
    for (const f of [baseline, candidate]) { await f.page.addStyleTag({ content: css }); await f.page.emulateMedia({ reducedMotion: "reduce" }); }
    // CatalogWorkspace lays its adaptive host over the whole workspace with a :global rule that ties AdaptiveSurfaceLayout's
    // own scoped rule. A build emits the child's stylesheet first, so the workspace rule wins; this harness injects
    // component styles in mount order, which inverts that. Re-adding the workspace's rule last restores the built
    // cascade the shell reproduces (its host takes `fill` instead of a cross-component rule).
    await baseline.page.addStyleTag({ content: "[data-catalog-workspace] [data-adaptive-host] { position:absolute; inset:0; }" });
    for (const width of [1280, 390]) {
      for (const f of [baseline, candidate]) { await f.page.setViewportSize({ width, height: 800 }); await settle(f.page); }
      await compare(candidate, baseline, `${width}-top`);
      for (const f of [baseline, candidate]) { await f.page.locator("[data-catalog-scroll]").evaluate(element => { element.scrollTop = 260; }); await settle(f.page); }
      await compare(candidate, baseline, `${width}-docked`);
      for (const f of [baseline, candidate]) await f.page.locator("[data-catalog-scroll]").evaluate(element => { element.scrollTop = 0; });
    }
    assert.equal(await candidate.page.title(), "Notes · Notebook");
    assert.deepEqual(baseline.errors, []); assert.deepEqual(candidate.errors, []);
  } finally { await baseline.close(); await candidate.close(); }
});

test("the instance drives the viewport: scroll positions, the place title, items by id and the navigation pane", { timeout: 60000 }, async () => {
  // The sidebar remembers its state in a cookie: the page needs an origin.
  const f = await svelteBrowser(after, {}, "http://desert-shell.test/");
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 1280, height: 800 });
    await f.page.evaluate(() => Reflect.get(window, "shell")().restoreScroll(240, 0));
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "shell")().scrollPositions()), { content: 240, search: 0 });
    await f.page.evaluate(() => Reflect.get(window, "shell")().scrollToTop());
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "shell")().scrollTop()), 0);
    await f.page.evaluate(() => Reflect.get(window, "shell")().focusTitle());
    assert.equal(await f.page.evaluate(() => document.activeElement?.hasAttribute("data-place-title")), true);
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "shell")().revealItem("archive")), true);
    assert.equal(await f.page.evaluate(() => document.activeElement?.textContent?.trim()), "Archive");
    assert.ok(await f.page.evaluate(() => Reflect.get(window, "shell")().scrollTop()) > 0, "the item was scrolled into view");
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "shell")().revealItem("missing")), false);
    assert.equal(await f.page.evaluate(() => Reflect.get(window, "shell")().focus("nothing-registered")), false);
    await f.page.evaluate(() => Reflect.get(window, "shell")().focusContent());
    assert.equal(await f.page.evaluate(() => document.activeElement?.hasAttribute("data-catalog-content")), true, "the main place takes focus");
    const pane = f.page.getByRole("navigation", { name: "Main navigation", exact: true });
    assert.equal(await pane.count(), 1);
    await f.page.evaluate(() => Reflect.get(window, "shell")().toggleNavigation());
    await f.page.getByRole("button", { name: "Show navigation", exact: true }).waitFor();
    await f.page.getByRole("button", { name: "Show navigation", exact: true }).click();
    await f.page.locator('[data-slot="sidebar-wrapper"][data-state="expanded"]').waitFor();
    await f.page.getByRole("button", { name: "Hide navigation", exact: true }).click();
    await f.page.getByRole("button", { name: "Show navigation", exact: true }).click();
    await f.page.getByRole("button", { name: "Trash", exact: true }).click();
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["navigate:trash"]);
    assert.equal(await f.page.getByRole("button", { name: "Trash", exact: true }).getAttribute("aria-current"), "page");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("search: opening it remembers its toggle; Escape inside cancels and returns focus there; a press outside cancels", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(after);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 1280, height: 800 });
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    await f.page.waitForFunction(() => document.activeElement?.getAttribute("type") === "search");
    assert.equal(await f.page.locator("#notes-results[data-catalog-search-scroll]").count(), 1);
    assert.equal(await f.page.getByRole("region", { name: "Search in Notes", exact: true }).getAttribute("id"), "notes-results", "the overlay is the named search region");
    assert.equal(await f.page.locator("[data-catalog-workspace]").getAttribute("data-search-active"), "true");
    await f.page.keyboard.press("Escape");
    await f.page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Search");
    assert.equal(await f.page.locator("#notes-results").count(), 0);
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    await f.page.locator("[data-surface-page-content], [data-catalog-search-scroll]").first().waitFor();
    await f.page.mouse.click(5, 790);
    await f.page.waitForFunction(() => document.querySelector("[data-catalog-workspace]")?.getAttribute("data-search-active") === "false");
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["cancel:true", "cancel:true"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("search: a press on a control inside its results belongs to the search; a press on their background cancels it", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(after);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 1280, height: 800 });
    await f.page.getByRole("button", { name: "Search", exact: true }).click();
    await f.page.waitForFunction(() => document.activeElement?.getAttribute("type") === "search");
    await f.page.getByRole("button", { name: "Plan line 1.", exact: true }).click();
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["select:first"], "the result is activated, the search stays");
    assert.equal(await f.page.locator("[data-catalog-workspace]").getAttribute("data-search-active"), "true");
    const box = await f.page.locator("#notes-results").boundingBox();
    assert.ok(box);
    await f.page.mouse.click(box.x + box.width / 2, box.y + box.height - 20);
    await f.page.waitForFunction(() => document.querySelector("[data-catalog-workspace]")?.getAttribute("data-search-active") === "false");
    assert.deepEqual(await f.page.evaluate(() => Reflect.get(window, "events")()), ["select:first", "cancel:true"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
