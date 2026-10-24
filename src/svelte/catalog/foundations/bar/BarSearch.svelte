<script lang="ts">
  // Bar part (from the toolbar-search composition): the place search field, revealed by a toggle that also closes it.
  // Opening focuses the field; the displayed query freezes while closed so the field does not change as it hides.
  import { tick, untrack } from "svelte";
  import { Action, SearchField } from "../../index.ts";
  let { title, query, open, resultsId, onquery, onopen, oncancel }: {
    title: string; query: string; open: boolean; resultsId: string;
    onquery: (query: string) => void; onopen: () => void; oncancel: () => void;
  } = $props();
  const id = $props.id();
  let input = $state<HTMLInputElement | null>(null);
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (open) displayedQuery = query; });
  async function toggle() {
    if (open) { oncancel(); return; }
    onopen(); await tick(); input?.focus({ preventScroll: true });
  }
</script>

<div data-catalog-search-actions data-expanded={open}>
  <!-- The field wrapper the vendor field family drew for the toolbar search (same classes, no vendor import). -->
  <div role="group" data-catalog-search class="group/field flex w-full flex-col gap-2 [&>.sr-only]:w-auto" inert={!open} aria-hidden={!open}>
    <label class="sr-only" for={id}>Search {title.toLowerCase()}</label>
    <!-- F1-merge: Field (purpose "search", focus "on-mount"; F1b) replaces SearchField and its element callback. -->
    <SearchField {id} onready={element => input = element} value={displayedQuery} onvalue={onquery} placeholder={`Search in ${title}`}
      aria-controls={open ? resultsId : undefined} tabindex={open ? undefined : -1} />
  </div>
  <!-- F1-merge: Action takes `disclosure` (F1b, DESIGN §3.1); the glyph cross-fade of the old toggle moves to Action. -->
  <div class="toolbar-action" data-search-toggle>
    <Action label={open ? "Close search" : "Search"} icon={open ? "close" : "search"} face="icon" emphasis="secondary" onclick={toggle}
      elementProps={{ "aria-expanded": open, "aria-controls": open ? resultsId : undefined }} />
  </div>
</div>
