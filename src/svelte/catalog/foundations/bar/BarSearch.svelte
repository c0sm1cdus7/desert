<script lang="ts">
  // Bar part (from the toolbar-search composition): the place search field, revealed by a toggle that also closes it.
  // Opening focuses the field; the displayed query freezes while closed so the field does not change as it hides.
  import { tick, untrack } from "svelte";
  import { Action, SearchField } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
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
    <label class="sr-only" for={id}>{say(m.bar.searchLabel, { title: title.toLowerCase() })}</label>
    <!-- F1-merge: Field (purpose "search") replaces SearchField once it controls its results (aria-controls) and can stay
         mounted while closed without taking focus: this rail keeps the well mounted so its width animates open. -->
    <SearchField {id} onready={element => input = element} value={displayedQuery} onvalue={onquery} placeholder={say(m.bar.searchPlaceholder, { title })}
      aria-controls={open ? resultsId : undefined} tabindex={open ? undefined : -1} />
  </div>
  <!-- The old toggle cross-faded its search and close glyphs; Action shows one glyph per state (no motion package yet). -->
  <div class="toolbar-action" data-search-toggle>
    <Action label={open ? say(m.bar.closeSearch) : say(m.bar.search)} icon={open ? "close" : "search"} face="icon" emphasis="secondary" state="ready"
      type="button" onclick={toggle} disclosure={{ id: `${id}-toggle`, controls: resultsId, expanded: open, haspopup: "listbox" }} />
  </div>
</div>
