<script lang="ts">
  // DateControl part: the month calendar. Its header holds the month and the previous/next controls in both
  // presentations, anchored or in the popover's sheet (design §1.3); the cell measure follows the presentation it sits in.
  import { onMount, untrack } from "svelte";
  import { parseDate, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import { Calendar as CalendarPrimitive } from "bits-ui";
  import * as Calendar from "../../../vendor/components/ui/calendar/index.js";
  import { Action } from "../../index.ts";
  import { revealSurfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  let { value, visibleDate = $bindable(), label, minimum, maximum, disabled, onchange, onclear }: {
    visibleDate: DateValue;
    value?: DateValue | undefined; label: string; minimum?: string | undefined; maximum?: string | undefined; disabled: boolean;
    onchange: (value: DateValue | undefined) => void; onclear?: (() => void) | undefined;
  } = $props();
  const month = new DateFormatter("en-US", { month: "long", year: "numeric" });
  let root = $state<HTMLElement | null>(null);
  let presentation = $state<"anchored" | "sheet">("anchored");
  $effect(() => { presentation = root?.closest('[data-modal="sheet"]') ? "sheet" : "anchored"; });
  // Bits synchronizes placeholder to its selected value during initialization.
  // Restore the owner's browsing cursor once that startup synchronization ends.
  const retainedDate = untrack(() => visibleDate);
  onMount(() => { visibleDate = retainedDate; });
</script>

<Calendar.Calendar bind:ref={root} type="single" {...(value ? { value } : {})} bind:placeholder={visibleDate} preventDeselect calendarLabel={label}
  {...(minimum ? { minValue: parseDate(minimum) } : {})} {...(maximum ? { maxValue: parseDate(maximum) } : {})}
  {disabled} onValueChange={onchange} presentation="picker" class="p-0" data-date-calendar={presentation} revealFocus={revealSurfaceFocus}>
  {#snippet header(visibleMonth)}
    <CalendarPrimitive.Heading class="sr-only" />
    <div data-date-calendar-header>
      <div data-date-calendar-row>
        <h2 class="type-section" data-date-calendar-month>{month.format(visibleMonth.toDate(getLocalTimeZone()))}</h2>
        <span data-date-calendar-navigation>
          <Calendar.PrevButton aria-label="Previous month" />
          <Calendar.NextButton aria-label="Next month" />
        </span>
      </div>
    </div>
  {/snippet}
</Calendar.Calendar>
{#if value && onclear}
  <Action label="Clear date" icon="close" face="fit" emphasis="secondary" type="button" state={disabled ? "unavailable" : "ready"} onclick={onclear} />
{/if}
