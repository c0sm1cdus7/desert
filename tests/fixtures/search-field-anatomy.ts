import { svelteBrowser } from "./svelte-browser.ts";
import { rendererCss } from "./renderer-css.ts";

const css = rendererCss();
export type SearchConsumer = "collection" | "catalog";
export const searchLabel = { collection: "Search loaded records", catalog: "Find component" };

export async function searchFixture(consumer: SearchConsumer) {
  const fixture = await svelteBrowser(`<script lang="ts">
    import Collection from "@desert/svelte/Collection.svelte";
    import CatalogNavigation from "@desert/svelte/catalog/CatalogNavigation.svelte";
    import { matchingEntries } from "@desert/svelte/catalog/navigation.ts";
    let query = $state("");
    let loaded = $state(true);
    let submissions = $state(0);
    const entries = $derived(matchingEntries(query));
    const node = $derived({ version: "desert.bank-node/1", kind: "collection", object: "note",
      fields: ["title"], labels: { "note.title": "Title" }, createLabel: "Create note", loaded,
      disabled: false, selectedId: null, records: [
        { id: "a", version: 1, facts: { title: "Alpha" } },
        { id: "b", version: 1, facts: { title: "Beta" } },
      ] });
  </script>
  <main style="max-width:520px;padding:24px">
    <form onsubmit={event => { event.preventDefault(); submissions += 1; }}>
      ${consumer === "collection" ? '<Collection {node} select={() => {}} />'
        : '<CatalogNavigation bind:query {entries} />'}
      <button type="submit">Submit fixture</button>
    </form>
    <button onclick={() => { loaded = false; }}>Unload records</button>
    <output aria-label="Form submissions">{submissions}</output>
  </main>`);
  await fixture.page.addStyleTag({ content: await css });
  await fixture.page.emulateMedia({ reducedMotion: "reduce" });
  return fixture;
}

export async function directSearchFixture() {
  const fixture = await svelteBrowser(`<script lang="ts">
    import SearchField from "@desert/svelte/pieces/SearchField.svelte";
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
