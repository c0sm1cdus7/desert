import { svelteBrowser } from "./svelte-browser.ts";
import { rendererCss } from "./renderer-css.ts";

const css = rendererCss();
export type SearchConsumer = "collection" | "catalog";
export const searchLabel = { collection: "Search notes", catalog: "Search component bank" };

export async function searchFixture(consumer: SearchConsumer) {
  const fixture = await svelteBrowser(`<script lang="ts">
    import CatalogWorkspace from "@desert/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte";
    import {viewEventOwnership} from '@desert/web/client/view-events.ts';
    import { matchingEntries, catalogTitle } from "@desert/svelte/infra/catalog-entries.ts";
    import { retrieveCollection } from "@desert/svelte/collection-retrieval.ts";
    let query = $state("");
    let searching = $state(false);
    let submissions = $state(0);
    const title = ${JSON.stringify(consumer === "collection" ? "Notes" : "Component bank")};
    const entries = matchingEntries("");
    const node = { version: "desert.bank-node/1", kind: "collection", object: "note",
      fields: ["title"], labels: { "note.title": "Title" }, createLabel: "Create note", loaded: true,
      disabled: false, selectedId: null, records: [
        { id: "a", version: 1, facts: { title: "Alpha" } },
        { id: "b", version: 1, facts: { title: "Beta" } },
      ] };
    const results = $derived(!query.trim() ? [] : ${consumer === "collection"
      ? 'retrieveCollection(node.records, node.fields, query).map(record => ({ kind: "content", id: record.id, title: record.facts.title, description: "Note" }))'
      : 'matchingEntries(query).map(entry => ({ kind: "bank", id: entry.id, title: catalogTitle(entry.id), description: entry.id }))'});
    const resolved={view:{version:'desert.view/1',id:'search-fixture',outputs:['select'],content:[
      ${consumer === "collection" ? "{kind:'collection',id:'notes',input:'notes',output:'select'}" : "{kind:'visual-catalog',id:'bank',catalog:'web'}"}
    ]},bindings:{notes:node},disabledOutputs:[],owner:viewEventOwnership().sync([],false).main};
  </script>
  <form onsubmit={event => { event.preventDefault(); submissions += 1; }}>
    <CatalogWorkspace navigationSurface={{title:'Test',settingsPlaceholder:true}} {title} active="home" navigation={[{ id: "home", label: title, icon: "catalog" }]}
      identity={{ title, subtitle: "Search anatomy fixture" }} onnavigate={() => {}}
      {query} onquery={value => query = value} {searching} onsearch={() => searching = true}
      oncancel={() => { searching = false; query = ""; }}
      content={{kind:'view-program',visited:[resolved],activeView:resolved.view.id,albums:{},onevent:()=>{},onalbum:()=>{},onactions:()=>{}}}
      searchContent={{kind:'catalog',title,results,description:'Search only exposed values.',onselect:()=>{searching=false;query='';}}} />
  </form>
  <output aria-label="Form submissions">{submissions}</output>`);
  await fixture.page.addStyleTag({ content: await css });
  await fixture.page.emulateMedia({ reducedMotion: "reduce" });
  await fixture.page.getByRole("button", { name: "Search", exact: true }).click();
  return fixture;
}

export async function directSearchFixture() {
  const fixture = await svelteBrowser(`<script lang="ts">
    import SearchField from "@desert/svelte/catalog/foundations/search-field/SearchField.svelte";
    let query = $state("");
    let readonly = $state(false);
    let disabled = $state(false);
    let changes = $state<string[]>([]);
  </script>
  <main style="padding:16px">
    <label for="direct-search">Direct search</label>
    <SearchField id="direct-search" bind:value={query} {readonly} {disabled}
      onvalue={value => { changes = [...changes, value]; }} />
    <button onclick={() => { readonly = true; }}>Make read only</button>
    <button onclick={() => { readonly = false; disabled = true; }}>Disable search</button>
    <output aria-label="Bound query">{query}</output>
    <output aria-label="Change callbacks">{JSON.stringify(changes)}</output>
  </main>`);
  await fixture.page.addStyleTag({ content: await css });
  await fixture.page.setViewportSize({ width: 320, height: 600 });
  await fixture.page.emulateMedia({ reducedMotion: "reduce" });
  return fixture;
}
