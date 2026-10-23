<script lang="ts">
  import { tick, untrack } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import { Button } from "../vendor/components/ui/button/index.js";
  import SearchField from "./SearchField.svelte";
  import type { ToolbarContent } from "./toolbar-content.ts";
  let { content }: { content: Extract<ToolbarContent, { kind: "search" }> } = $props();
  const id = $props.id();
  let input = $state<HTMLInputElement | null>(null);
  let displayedQuery = $state(untrack(() => content.query));
  $effect(() => { if (content.searching) displayedQuery = content.query; });
  async function toggle() {
    if (content.searching) { content.oncancel(); return; }
    content.onsearch(); await tick(); input?.focus({ preventScroll: true });
  }
</script>

<div data-catalog-search-actions data-expanded={content.searching}>
  <Field.Field purpose="toolbar-search" inert={!content.searching} aria-hidden={!content.searching}>
    <Field.Label visibility="assistive" for={id}>Search {content.title.toLowerCase()}</Field.Label>
    <SearchField {id} onready={element=>input=element} value={displayedQuery} onvalue={content.onquery} placeholder={`Search in ${content.title}`}
      aria-controls={content.searching ? content.resultsId : undefined} tabindex={content.searching ? undefined : -1} />
  </Field.Field>
  <Button variant="secondary" size="icon" presentation="search-toggle" searching={content.searching}
    aria-label={content.searching ? "Close search" : "Search"} title={content.searching ? "Close search" : "Search"}
    aria-expanded={content.searching} aria-controls={content.searching ? content.resultsId : undefined} onclick={toggle} />
</div>
