<script lang="ts">
  // Bar part (from the toolbar-search composition): the place search field, revealed by a toggle that also closes it.
  // Opening it from its toggle focuses the field (a search opened elsewhere keeps focus where it is); the displayed query
  // freezes while closed so the field does not change as it hides.
  // The rail keeps the field mounted while closed (inert) so its well grows from the toggle as it opens.
  import { untrack } from "svelte";
  import { Action, Field } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { title, query, open, resultsId, onquery, onopen, oncancel }: {
    title: string; query: string; open: boolean; resultsId: string;
    onquery: (query: string) => void; onopen: () => void; oncancel: () => void;
  } = $props();
  const id = $props.id();
  let displayedQuery = $state(untrack(() => query)), requested = $state(false);
  $effect(() => { if (open) displayedQuery = query; else requested = false; });
  function toggle() { if (open) oncancel(); else { requested = true; onopen(); } }
</script>

<div data-catalog-search-actions data-expanded={open}>
  <div data-catalog-search class="flex w-full flex-col" inert={!open} aria-hidden={!open}>
    <Field primitive="input.text" purpose="search" label={say(m.bar.searchLabel, { title: title.toLowerCase() })} labelVisibility="accessible"
      measure="fill" value={displayedQuery} placeholder={say(m.bar.searchPlaceholder, { title })} clear required={false} invalid={false}
      disabled={false} focus={open && requested ? "on-mount" : undefined} controls={open ? resultsId : undefined} expanded={open} bar="search"
      onchange={onquery} />
  </div>
  <!-- The old toggle cross-faded its search and close glyphs; Action shows one glyph per state (no motion package yet). -->
  <div class="toolbar-action" data-search-toggle>
    <Action label={open ? say(m.bar.closeSearch) : say(m.bar.search)} icon={open ? "close" : "search"} face="icon" emphasis="secondary" state="ready"
      type="button" bar="command" onclick={toggle} disclosure={{ id: `${id}-toggle`, controls: resultsId, expanded: open, haspopup: "listbox" }} />
  </div>
</div>
