<script lang="ts">
  // F1-merge: temporary popover part, replaced by <Field primitive="trigger" display disclosure onopen> (lane F1b). It
  // draws today's field-well trigger (the well DateControl drew) with the disclosure semantics as data.
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { FieldWellContent } from "../../index.ts";
  import { MeasuredField } from "../../index.ts";
  import type { Disclosure } from "../../../infra/disclosure.ts";
  import type { CatalogProps } from "../../types.d.ts";
  type FieldTriggerData = Extract<CatalogProps<"popover">["trigger"], { kind: "field" }>;
  let { label, required, invalid, disabled, display, measure, disclosure, onopen }: {
    label: string; required: boolean; invalid: boolean; disabled: boolean; display: FieldTriggerData["display"]; measure: FieldTriggerData["measure"];
    disclosure: Disclosure; onopen: () => void;
  } = $props();
  const kinds = { writing: "input.text", choice: "control.select", date: "control.date", amount: "control.money", fill: "input.text" } as const;
  let value = $derived(display.kind === "tags" ? display.tags.map(tag => tag.label).join(", ") : display.text);
</script>
<MeasuredField kind={kinds[measure]} {invalid} {disabled}>
  <Button id={disclosure.id} variant="well" size="well" class="field-well w-full overflow-hidden"
    data-floating-field data-filled data-date-trigger={measure === "date" || undefined} {disabled}
    aria-label={`${label} · ${value}`} aria-describedby={required ? `${disclosure.id}-requirement` : undefined}
    aria-haspopup={disclosure.haspopup} aria-expanded={disclosure.expanded}
    aria-controls={disclosure.expanded ? disclosure.controls : undefined} data-state={disclosure.expanded ? "open" : "closed"}
    onclick={onopen} onkeydown={event => { if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !disclosure.expanded) { event.preventDefault(); onopen(); } }}>
    <FieldWellContent {label} {required}>
      <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
        <span>{value}</span>
        {#if measure === "date"}<Icon name="calendar" placement="inline-end" decorative />
        {:else}<Icon name="chevron-down" placement="inline-end" chevron decorative />{/if}
      </span>
    </FieldWellContent>
  </Button>
  {#if required}<span id={`${disclosure.id}-requirement`} class="sr-only">Required</span>{/if}
</MeasuredField>
