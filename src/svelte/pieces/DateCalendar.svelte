<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { parseDate, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import { Calendar as CalendarPrimitive } from "bits-ui";
  import * as Calendar from "../vendor/components/ui/calendar/index.js";
  import Toolbar from "./Toolbar.svelte";
  import { toolbarAction } from "../../interaction/toolbar.ts";
  import { Button } from "../vendor/components/ui/button/index.js";
  let { value, visibleDate = $bindable(), label, minimum, maximum, disabled, onchange, onclose, onclear, presentation = "anchored" }: {
    visibleDate: DateValue;
    value?: DateValue | undefined; label: string; minimum?: string | undefined; maximum?: string | undefined; disabled: boolean;
    onchange: (value: DateValue | undefined) => void; onclose?: (() => void) | undefined;
    presentation?: "anchored" | "sheet";
    onclear?: (() => void) | undefined;
  } = $props();
  const month = new DateFormatter("en-US", { month: "long", year: "numeric" });
  // Bits synchronizes placeholder to its selected value during initialization.
  // Restore the owner's browsing cursor once that startup synchronization ends.
  const retainedDate = untrack(() => visibleDate);
  onMount(() => { visibleDate = retainedDate; });
</script>

<Calendar.Calendar type="single" {...(value ? { value } : {})} bind:placeholder={visibleDate} preventDeselect calendarLabel={label}
  {...(minimum ? { minValue: parseDate(minimum) } : {})} {...(maximum ? { maxValue: parseDate(maximum) } : {})}
  {disabled} onValueChange={onchange} presentation="picker" class="p-0" data-date-calendar={presentation}>
  {#snippet header(visibleMonth)}
    <CalendarPrimitive.Heading class="sr-only" />
    <Toolbar toolbar={{ edge: "top", title: month.format(visibleMonth.toDate(getLocalTimeZone())),
      ...(onclose ? { leading: toolbarAction({ kind: "close" }, `Close ${label}`, "close") } : {}) }}
      invoke={() => onclose?.()}>
      {#snippet controls()}
        <Calendar.PrevButton variant="secondary" aria-label="Previous month" />
        <Calendar.NextButton variant="secondary" aria-label="Next month" />
      {/snippet}
    </Toolbar>
  {/snippet}
</Calendar.Calendar>
{#if value && onclear}<Button variant="ghost" class="shrink-0" onclick={onclear} {disabled}>Clear date</Button>{/if}

<style>
  :global([data-date-calendar]) { display:flex; flex-direction:column; min-height:0; }
  :global([data-date-calendar] .workspace-header) { padding:.25rem 0 .75rem; flex-shrink:0; overflow:visible; }
  :global([data-date-calendar="anchored"]) { --cell-size:max(2rem,calc((100cqi - 1rem)/7)); }
  /* Preserve legible, nonoverlapping targets; extreme text sizes scroll locally.
     Use the shared type role's rem length, not ch/em: cell, weekday and button
     have different fonts and must nevertheless resolve the SAME column size. */
  :global([data-date-calendar="sheet"]) { --cell-size:max(calc(var(--text-control) * 1.5),calc((100cqi - 4px)/7)); }
  :global([data-date-calendar="sheet"] td) { height:max(var(--cell-size),44px); }
  :global([data-date-calendar="sheet"] [data-calendar-day]) { min-width:0; }
  :global([data-date-calendar] [data-toolbar-controls] button) { width:36px; height:36px; min-height:36px; }
  :global([data-date-calendar="sheet"] [data-toolbar-controls] button) { width:44px; height:44px; min-height:44px; }
  :global([data-date-calendar] [data-calendar-grid-viewport]) { padding:2px; }
  @media (pointer:coarse) {
    :global([data-date-calendar] [data-toolbar-controls] button) { width:44px; height:44px; min-height:44px; }
  }
</style>
