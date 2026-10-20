<script lang="ts">
  // Adapted from Tres Marías design-system select-content; Apache-2.0 (vendor/LICENSE).
  import { Select } from "bits-ui";
  import { cn, type WithoutChild } from "../../../utils.js";
  import { useSurfaceTypography } from '@desert/svelte/pieces/surface-typography.svelte.ts';
  const density = useSurfaceTypography();
  let { children, class: className, ...props }: WithoutChild<Select.ContentProps> = $props();
</script>
<Select.Portal>
  <Select.Content sideOffset={4} align="start" collisionPadding={12} preventScroll={false} {...props}
    data-type-density={density()} data-slot="select-content" data-material="pane" class={cn("floating-pane selection-surface", className)}>
    <Select.Viewport class="w-full p-1">{@render children?.()}</Select.Viewport>
  </Select.Content>
</Select.Portal>
