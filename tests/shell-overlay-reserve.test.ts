// A main place over an overlay navigation reserves the navigation return below its reading and starts reveals near its
// top: Surface draws that reservation (its own scroll viewport), told by Shell through a typed prop; shell's stylesheet
// no longer styles the surface's viewport for it (slice 3 close-out, catalog-shell.css:81).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { workspaceBodySource } from "./fixtures/workspace-body.ts";

const content = [{ kind: "stack", id: "plans", title: "Plans", items: Array.from({ length: 30 }, (_, index) => ({ kind: "text" as const, text: `Plan line ${index}.` })) }] as const;
const source = `<script lang="ts">
  import CatalogWorkspace from '@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte';
  ${workspaceBodySource(content)}
</script>
<CatalogWorkspace documentTitle="Notes · Notebook" navigationSurface={{title:'Notebook',settingsPlaceholder:true}} title="Notes"
  identity={{title:'Notes',subtitle:'Your writing'}} navigation={[{id:'notes',label:'Notes',icon:'create'},{id:'trash',label:'Trash',icon:'archive'}]}
  active="notes" query="" searching={false} detail={false} onback={() => {}} onsearch={() => {}} oncancel={() => {}} onquery={() => {}}
  onnavigate={() => {}} searchContent={{kind:'view',title:'Notes',description:'Find content in this destination.',results:[],onselect:()=>{}}}
  content={workspaceBody} />`;

/** The viewport's reservation, and what the same expressions compute inside it. */
const reading = (page: Awaited<ReturnType<typeof svelteBrowser>>["page"]) => page.locator("[data-catalog-content] > [data-catalog-scroll]").evaluate(viewport => {
  const probe = document.createElement("div");
  probe.style.paddingBlockEnd = "calc(var(--catalog-toolbar-height) + var(--catalog-toolbar-inset) + env(safe-area-inset-bottom,0px) + 32px)";
  probe.style.paddingBlockStart = "calc(var(--catalog-toolbar-inset) + var(--catalog-toolbar-height) + var(--scroll-edge-feather,32px))";
  viewport.append(probe);
  const expected = getComputedStyle(probe), style = getComputedStyle(viewport);
  const result = { presentation: document.querySelector('[data-slot="sidebar-wrapper"]')?.getAttribute("data-presentation"),
    end: style.paddingBlockEnd, scrollStart: style.scrollPaddingBlockStart, scrollEnd: style.scrollPaddingBlockEnd,
    reserve: expected.paddingBlockEnd, start: expected.paddingBlockStart };
  probe.remove();
  return result;
});

test("an overlay navigation's main place reserves the navigation return; a docked one does not", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    await f.page.setViewportSize({ width: 390, height: 844 });
    const overlay = await reading(f.page);
    assert.equal(overlay.presentation, "overlay");
    assert.notEqual(overlay.reserve, "0px");
    assert.deepEqual([overlay.end, overlay.scrollStart, overlay.scrollEnd], [overlay.reserve, "16px", overlay.reserve]);
    await f.page.setViewportSize({ width: 1280, height: 900 });
    await f.page.waitForFunction(() => document.querySelector('[data-slot="sidebar-wrapper"]')?.getAttribute("data-presentation") === "docked");
    const docked = await reading(f.page);
    assert.deepEqual([docked.end, docked.scrollStart, docked.scrollEnd], ["0px", docked.start, "auto"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("shell's stylesheet does not style the surface's scroll viewport for an overlay navigation", async () => {
  const shell = await readFile("src/svelte/catalog/foundations/shell/catalog-shell.css", "utf8");
  assert.doesNotMatch(shell, /\[data-presentation="overlay"\]\)\s*\[data-catalog-scroll\]/);
});
