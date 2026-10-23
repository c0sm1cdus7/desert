<script lang="ts">
  import { untrack } from "svelte";
  import { dismissWhenInactive } from '../pieces/surface-activity.svelte.ts';
  import { parseDate, today, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import * as Popover from "../vendor/components/ui/popover/index.js";
  import { Button } from "../vendor/components/ui/button/index.js";
  import DateCalendar from "../pieces/DateCalendar.svelte";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import FieldWellContent from "../pieces/FieldWellContent.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import PickerSheet from "../pieces/PickerSheet.svelte";
  import { PickerPresentation } from "../pieces/picker-presentation.svelte.ts";
  import type { ControlProps } from "../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"date"> = $props();
  // Six week rows plus month controls, field and collision margins must fit.
  const id = $props.id(), picker = new PickerPresentation({ panelRem: 20, minimumBlockRem: 28 });
  const format = new DateFormatter("en-US", { dateStyle: "medium" });
  let open = $state(false);
  let anchoredContent = $state<HTMLElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  $effect(() => { if (anchoredContent) focusBoundary = anchoredContent; });
  function restoreFocus(event: Event) {
    event.preventDefault();
    const active = document.activeElement, trigger = document.getElementById(id);
    if (!open && (!active || active === document.body || focusBoundary?.contains(active))
      && !node.disabled && trigger?.checkVisibility() && !trigger.closest('[hidden],[inert]'))
      trigger.focus({ preventScroll: true });
  }
  dismissWhenInactive(() => { open = false; });
  let observed = untrack(() => node.id);
  let observedValue = untrack(() => node.value);
  let visibleDate = $state<DateValue>(untrack(() => node.value ? parseDate(node.value) : today(getLocalTimeZone())));
  let date = $derived(node.value ? parseDate(node.value) : undefined);
  let label = $derived(date ? format.format(date.toDate(getLocalTimeZone())) : "No date selected");
  $effect(() => {
    const next = node.id, disabled = node.disabled, value = node.value, isOpen = open;
    untrack(() => {
      if (disabled || next !== observed) open = false;
      // Presentation may remount the calendar, but it does not start a new
      // browsing task. Closing or an owner replacement resets its cursor.
      if (!isOpen || next !== observed || value !== observedValue)
        visibleDate = value ? parseDate(value) : today(getLocalTimeZone());
      observed = next; observedValue = value;
    });
  });
  function change(value: DateValue | undefined) {
    if (!value || node.disabled) return;
    if (value.toString() !== node.value) onevent({ kind: "date.change", control: node.id, value: value.toString() });
    open = false;
  }
  function clear() {
    if (node.disabled || node.required) return;
    onevent({ kind: "date.change", control: node.id, value: null });
    open = false;
  }
</script>
{#snippet trigger(props: Record<string, unknown>)}
  <Button {...props} {id} variant="well" size="well" class="field-well w-full overflow-hidden"
    data-floating-field data-filled data-date-trigger disabled={node.disabled}
    aria-label={`${node.label} · ${label}`} aria-describedby={node.required ? `${id}-requirement` : undefined}
    aria-haspopup="dialog" aria-expanded={open}>
    <FieldWellContent label={node.label} required={node.required}>
      <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
        <span>{label}</span><CalendarIcon data-icon="inline-end" aria-hidden="true" />
      </span>
    </FieldWellContent>
  </Button>
{/snippet}
{#snippet calendar()}
  <DateCalendar value={date} bind:visibleDate label={node.label} minimum={node.minimum} maximum={node.maximum} presentation={picker.current}
    disabled={node.disabled} onchange={change} onclear={node.required ? undefined : clear}
    onclose={picker.current === "sheet" ? () => { open = false; } : undefined} />
{/snippet}
<MeasuredField kind="control.date" disabled={node.disabled}>
  {#if picker.current === "sheet"}
    {@render trigger({ onclick: () => { open = true; } })}
    <PickerSheet bind:open label={node.label} triggerId={id} contentToolbar>{@render calendar()}</PickerSheet>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger {id} disabled={node.disabled}>
        {#snippet child({ props })}{@render trigger(props)}{/snippet}
      </Popover.Trigger>
      <Popover.Content bind:ref={anchoredContent} onCloseAutoFocus={restoreFocus}
        role="dialog" aria-label={node.label} aria-modal="false" style="width:20rem;overflow:hidden">
        {@render calendar()}
      </Popover.Content>
    </Popover.Root>
  {/if}
  {#if node.required}<span id={`${id}-requirement`} class="sr-only">Required</span>{/if}
</MeasuredField>
