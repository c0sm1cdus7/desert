<script lang="ts">
  import { untrack } from "svelte";
  import { parseDate, today, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import DateCalendar from "./DateCalendar.svelte";
  import { Popover } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"date-control"> = $props();
  const format = new DateFormatter("en-US", { dateStyle: "medium" });
  let open = $state(false);
  let observed = untrack(() => node.id);
  let observedValue = untrack(() => node.value);
  let visibleDate = $state<DateValue>(untrack(() => node.value ? parseDate(node.value) : today(getLocalTimeZone())));
  let date = $derived(node.value ? parseDate(node.value) : undefined);
  let label = $derived(date ? format.format(date.toDate(getLocalTimeZone())) : "No date selected");
  $effect(() => {
    const next = node.id, value = node.value, isOpen = open;
    untrack(() => {
      if (next !== observed) open = false;
      // Presentation may remount the calendar, but it does not start a new
      // browsing task. Closing or an owner replacement resets its cursor.
      if (!isOpen || next !== observed || value !== observedValue)
        visibleDate = value ? parseDate(value) : today(getLocalTimeZone());
      observed = next; observedValue = value;
    });
  });
  function change(value: DateValue | undefined) {
    if (!value || node.disabled) return;
    if (value.toString() !== node.value) onevent?.({ kind: "date.change", control: node.id, value: value.toString() });
    open = false;
  }
  function clear() {
    if (node.disabled || node.required) return;
    onevent?.({ kind: "date.change", control: node.id, value: null });
    open = false;
  }
</script>
<Popover label={node.label} {open} disabled={node.disabled} locked={false} content="information" placement="adaptive" align="start"
  trigger={{ kind: "field", label: node.label, required: node.required, invalid: false,
    display: { kind: "text", text: label, placeholder: date === undefined }, measure: "date" }}
  onopenchange={next => { open = next; }}>
  <DateCalendar value={date} bind:visibleDate label={node.label} minimum={node.minimum} maximum={node.maximum}
    disabled={node.disabled} onchange={change} onclear={node.required ? undefined : clear} />
</Popover>
