// Lane F (DESIGN §4 items 76, 78, 79): the catalog workspace mapped onto the shell draws what the pre-shell workspace drew,
// at its place, while it searches (the prompt, result rows, record cards, no match) and on a detail with Back. The "before"
// is the frozen base source (fixtures/catalog-workspace-before.ts); differences are DESIGN §7 items or regressions.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss, themeBeforePrune } from "./fixtures/renderer-css.ts";
import { workspaceOwnerRulesBefore } from "./fixtures/workspace-owner-rules-before.ts";
import { buttonGlobalsBefore } from "./fixtures/button-globals-before.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";
import { pixelDifference } from "./fixtures/pixel-difference.ts";
import { catalogWorkspaceBefore } from "./fixtures/catalog-workspace-before.ts";

const content = [{ kind: "stack", id: "plans", title: "Plans", items: Array.from({ length: 12 }, (_, index) => ({ kind: "text" as const, text: `Plan line ${index}.` })) },
  { kind: "stack", id: "archive", title: "Archive", items: [{ kind: "text", text: "Last year." }] }] as const;
const card = (record: string, title: string) => ({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record, title,
  image: { asset: record, alt: title } });

const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource(content)}
  let searching = $state(false), query = $state(''), mode = $state('rows'), detail = $state(false);
  const rows = [{kind:'content',id:'plans',title:'Plans',description:'Plan line 1.'},{kind:'content',id:'archive',title:'Archive',description:'Last year.'}];
  const records = ${JSON.stringify(["mountain", "lake", "forest", "desert"].map(record => ({ kind: "record", id: record, node: card(record, record[0]!.toUpperCase() + record.slice(1)) })))};
  let results = $derived(mode === 'records' ? records : mode === 'none' ? [] : rows);
  Reflect.set(window, 'search', (next: string, kind: string) => { query = next; mode = kind; searching = true; });
  Reflect.set(window, 'detail', () => { detail = true; });
  Reflect.set(window, 'cancel', () => { searching = false; query = ''; });
</script>
<CatalogWorkspace documentTitle="Notes · Notebook" navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes"
  identity={{title:'Notes',subtitle:'Your writing'}} navigation={[{id:'notes',label:'Notes',icon:'create'},{id:'trash',label:'Trash',icon:'archive'}]}
  active="notes" {query} {searching} {detail} onback={() => { detail = false; }}
  onsearch={() => searching = true} oncancel={() => { searching = false; query = ''; }} onquery={value => query = value} onnavigate={() => {}}
  searchContent={{kind:'view',title:'Notes',description:'Find content in this destination.',results,onselect:()=>{}}}
  content={workspaceBody} />`;

const settle = (page: Awaited<ReturnType<typeof svelteBrowser>>["page"]) => page.evaluate(async () => {
  await document.fonts.ready;
  for (let frame = 0; frame < 6; frame++) await new Promise(done => requestAnimationFrame(done));
});

test("the workspace on the shell draws the pre-shell workspace's pixels at its place, searching and on a detail", { timeout: 240000 }, async () => {
  // The frozen side mounts the vendor button as it stood with its :global rules (the base the frozen rows were laid out by).
  const before = { ...catalogWorkspaceBefore, [resolve("src/svelte/vendor/components/ui/button/button.svelte")]: buttonGlobalsBefore };
  const [baseline, candidate] = [await svelteBrowser(source, before), await svelteBrowser(source)];
  const shots = process.env.WORKSPACE_SHOTS;
  try {
    // Each side draws with its own stylesheets: the frozen workspace with the base f7247e4 theme, today's with today's.
    const frozen = Object.values(before);
    const sheets = [await rendererCss(frozen, themeBeforePrune()), await rendererCss(frozen)];
    for (const [index, f] of [baseline, candidate].entries()) {
      await f.page.addStyleTag({ content: sheets[index] ?? "" }); await f.page.emulateMedia({ reducedMotion: "reduce" });
    }
    // The frozen workspace laid its adaptive host over the whole workspace with a :global rule this harness injects before
    // the host's own scoped rule; re-adding it last restores the built cascade (see shell-foundation.test.ts).
    // The frozen workspace still draws the old marks the shell, field, bar and icon no longer style: it brings their rules.
    await baseline.page.addStyleTag({ content: workspaceOwnerRulesBefore });
    await baseline.page.addStyleTag({ content: "[data-catalog-workspace] [data-adaptive-host] { position:absolute; inset:0; }" });
    const differences: Record<string, number> = {};
    const compare = async (name: string) => {
      for (const f of [baseline, candidate]) await settle(f.page);
      const [after, before] = [await candidate.page.screenshot(), await baseline.page.screenshot()];
      if (shots) { await mkdir(shots, { recursive: true }); await writeFile(`${shots}/${name}-after.png`, after); await writeFile(`${shots}/${name}-before.png`, before); }
      differences[name] = (await pixelDifference(candidate.page, after, before, 8)).count;
    };
    for (const width of [1280, 390]) {
      for (const f of [baseline, candidate]) await f.page.setViewportSize({ width, height: 800 });
      await compare(`${width}-place`);
      for (const [query, kind] of [["", "rows"], ["plan", "rows"], ["m", "records"], ["zzz", "none"]] as const) {
        for (const f of [baseline, candidate]) await f.page.evaluate(([next, mode]) => Reflect.get(window, "search")(next, mode), [query, kind]);
        await compare(`${width}-search-${kind}-${query || "prompt"}`);
      }
      for (const f of [baseline, candidate]) await f.page.evaluate(() => Reflect.get(window, "cancel")());
    }
    for (const f of [baseline, candidate]) await f.page.evaluate(() => Reflect.get(window, "detail")());
    await compare("390-detail");
    // Identical: the place, the search prompt (Status "prompt" in a filling Column) and a detail with Back, at both widths.
    // Different by design, so only recorded here: with a query, "Results in …" takes the page role's tracking (DESIGN §7 item
    // 3, "<h1> becomes page"), result rows are Row's (label at control weight; DESIGN §1.4, row absorbs search-result rows),
    // and record cards keep the spacing scale's close step (12px instead of 14px).
    const identical = ["1280-place", "1280-search-rows-prompt", "390-place", "390-search-rows-prompt", "390-detail"];
    assert.deepEqual(identical.map(name => [name, differences[name]]), identical.map(name => [name, 0]), JSON.stringify(differences));
    assert.deepEqual(baseline.errors, []); assert.deepEqual(candidate.errors, []);
  } finally { await baseline.close(); await candidate.close(); }
});
