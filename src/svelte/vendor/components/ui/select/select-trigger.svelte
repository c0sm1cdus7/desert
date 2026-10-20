<script lang="ts">
  // Adapted from Tres Marías design-system select-trigger; Apache-2.0 (vendor/LICENSE).
  import { Select } from "bits-ui";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { Button } from "../button/index.js";
  import { cn, type WithoutChild } from "../../../utils.js";
  let { children, class: className, withinWell = false, fieldControl = false, showChevron = true, ...props }:
    WithoutChild<Select.TriggerProps> & { withinWell?: boolean; fieldControl?: boolean; showChevron?: boolean } = $props();
</script>
<Select.Trigger {...props} data-slot="select-trigger">
  {#snippet child({ props: triggerProps })}
    <Button {...triggerProps} variant={fieldControl ? "well" : withinWell ? "field" : "outline"}
      size={fieldControl ? "well" : "default"} data-floating-field={fieldControl || undefined} data-filled={fieldControl || undefined}
      class={cn("w-full justify-between gap-3", fieldControl && "field-well overflow-hidden", className)}>
      {@render children?.()}
      {#if showChevron}<ChevronDown data-icon="inline-end" data-control-chevron aria-hidden="true" />{/if}
    </Button>
  {/snippet}
</Select.Trigger>
