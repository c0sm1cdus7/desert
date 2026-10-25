<script lang="ts">
  // Bar part (from the toolbar-search composition): the place search field, revealed by a toggle that also closes it.
  // Opening focuses the field; the displayed query freezes while closed so the field does not change as it hides.
  import { untrack } from "svelte";
  import { Action, Field } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { title, query, open, resultsId, onquery, onopen, oncancel }: {
    title: string; query: string; open: boolean; resultsId: string;
    onquery: (query: string) => void; onopen: () => void; oncancel: () => void;
  } = $props();
  const id = $props.id();
  // The field takes focus when this toggle opened it (not when the bar mounts with the search already open).
  let opened = $state(false);
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (open) displayedQuery = query; else opened = false; });
  function toggle() {
    if (open) { oncancel(); return; }
    opened = true; onopen();
  }
</script>

<div data-catalog-search-actions data-expanded={open}>
  <!-- The well stays mounted while closed (inert, so it takes no focus) so its width animates open. -->
  <div data-catalog-search inert={!open} aria-hidden={!open}>
    <Field primitive="input.text" purpose="search" label={say(m.bar.searchLabel, { title: title.toLowerCase() })} labelVisibility="accessible"
      required={false} invalid={false} disabled={false} measure="fill" value={displayedQuery} placeholder={say(m.bar.searchPlaceholder, { title })}
      clear={false} controls={open ? resultsId : undefined} focus={open && opened ? "on-mount" : undefined} onchange={onquery} />
  </div>
  <!-- The old toggle cross-faded its search and close glyphs; Action shows one glyph per state (no motion package yet). -->
  <div class="toolbar-action" data-search-toggle>
    <Action label={open ? say(m.bar.closeSearch) : say(m.bar.search)} icon={open ? "close" : "search"} face="icon" emphasis="secondary" state="ready"
      type="button" onclick={toggle} disclosure={{ id: `${id}-toggle`, controls: resultsId, expanded: open, haspopup: "listbox" }} />
  </div>
</div>
