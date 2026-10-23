<script lang="ts">
  import { Popover } from "bits-ui";
  import { buttonVariants } from "../button/index.js";
  import { cn } from "../../../utils.js";
  let { presentation = "standard", class: className, ...props }:
    Popover.TriggerProps & { presentation?: "standard" | "selection" | "reference-well" } = $props();
</script>
{#if presentation === "reference-well"}
  <Popover.Trigger {...props} data-slot="button" data-material="pane" data-variant="well" data-floating-field data-filled data-reference-well
    class={cn(buttonVariants({variant:"well",size:"well"}), "field-well overflow-hidden max-w-full", className)} />
{:else if presentation === "selection"}
  <Popover.Trigger {...props} data-slot="button" data-material="pane" data-variant="well"
    class={cn(buttonVariants({ variant: "well" }),
      "w-full h-auto min-h-[var(--control-size)] justify-between gap-4 whitespace-normal", className)} />
{:else}
  <Popover.Trigger {...props} class={className} />
{/if}
<style>
  :global([data-reference-well] [data-field-value]) { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3,.75rem); min-width:0; }
</style>
