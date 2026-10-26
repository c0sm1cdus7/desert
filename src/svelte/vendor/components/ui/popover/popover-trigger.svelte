<script lang="ts">
  import { Popover } from "bits-ui";
  import { cn } from "../../../utils.js";
  let { presentation = "standard", class: className, ...props }:
    Popover.TriggerProps & { presentation?: "standard" | "selection" | "reference-well" } = $props();
  // The well recipes this family draws itself (the button family's well variant, resolved), not another family's import.
  const well = "inline-flex shrink-0 items-center gap-2 type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-foreground rounded-[var(--radius-well)] justify-start text-left whitespace-normal w-full font-normal";
  // The reference well lays out its own value row (once a global rule of this file).
  const referenceValue = "[&_[data-field-value]]:flex [&_[data-field-value]]:items-center [&_[data-field-value]]:justify-between [&_[data-field-value]]:gap-[var(--space-3,.75rem)] [&_[data-field-value]]:min-w-0";
</script>
{#if presentation === "reference-well"}
  <Popover.Trigger {...props} data-slot="button" data-variant="well" data-floating-field data-filled data-reference-well
    class={cn(well, "p-0", "material-pane control-feedback", "field-well overflow-hidden max-w-full", referenceValue, className)} />
{:else if presentation === "selection"}
  <Popover.Trigger {...props} data-slot="button" data-variant="well"
    class={cn(well, "min-h-11 px-(--row-inset) py-2", "material-pane control-feedback",
      "w-full h-auto min-h-[var(--control-size)] justify-between gap-4 whitespace-normal", className)} />
{:else}
  <Popover.Trigger {...props} class={className} />
{/if}
