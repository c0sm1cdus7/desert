<script lang="ts">
  // Adapted from Tres Marías design-system popover-content; Apache-2.0 (vendor/LICENSE).
  import { Popover } from "bits-ui";
  import { cn } from "../../../utils.js";
  import { surfaceFocus } from "@desert/svelte/pieces/surface-focus.svelte.ts";
  import { useSurfaceTypography } from '@desert/svelte/pieces/surface-typography.svelte.ts';
  let { ref = $bindable(null), class: className, ...props }: Omit<Popover.ContentProps, "child"> = $props();
  const focus = surfaceFocus(() => ref);
  const density = useSurfaceTypography();
</script>
<Popover.Portal>
  <Popover.Content bind:ref sideOffset={8} align="start" collisionPadding={12} trapFocus={false} preventScroll={false}
    onOpenAutoFocus={focus}
    {...props} data-material="pane" data-type-density={density()} data-slot="popover-content" class={cn("floating-pane anchored-surface", className)} />
</Popover.Portal>
