<script lang="ts">
  import { tick, untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import SearchField from "../pieces/SearchField.svelte";
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  let { title, query, onquery, searching, resultsId, onsearch, oncancel, searchAvailable = true }: {
    title: string; query: string; onquery: (query: string) => void; searching: boolean;
    resultsId: string; onsearch: () => void; oncancel: () => void; searchAvailable?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const id = $props.id();
  let input = $state<HTMLInputElement | null>(null);
  let toggleButton = $state<HTMLButtonElement | null>(null);
  // Product cancellation may clear its query immediately. Retain only the
  // outgoing field's paint until the next opening; no stale search is executed.
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (searching) displayedQuery = query; });
  async function toggle() {
    if (searching) { oncancel(); return; }
    onsearch(); await tick(); input?.focus({ preventScroll: true });
  }
</script>

{#snippet searchActions()}
  <div data-catalog-search-actions data-expanded={searching}>
  <Field.Field data-catalog-search inert={!searching} aria-hidden={!searching}>
    <Field.Label class="sr-only" for={id}>Search {title.toLowerCase()}</Field.Label>
    <SearchField {id} bind:ref={input} value={displayedQuery} onvalue={onquery} placeholder={`Search in ${title}`}
      aria-controls={searching ? resultsId : undefined} tabindex={searching ? undefined : -1} />
  </Field.Field>
  <Button bind:ref={toggleButton} variant="secondary" size="icon" data-catalog-search-toggle data-catalog-search-cancel={searching || undefined}
    aria-label={searching ? "Close search" : "Search"} title={searching ? "Close search" : "Search"}
    aria-expanded={searching} aria-controls={searching ? resultsId : undefined} onclick={toggle}>
    <Search data-search-icon="open" aria-hidden="true" /><X data-search-icon="close" aria-hidden="true" />
  </Button>
  </div>
{/snippet}

<!-- Search stays mounted when its edge changes, preserving composition and focus. -->
{#if searchAvailable}
<ToolbarLayout data-catalog-toolbar
  data-searching={searching} edge={sidebar.presentation === "overlay" ? "bottom" : "top"}>
  {@render searchActions()}
</ToolbarLayout>
{/if}
