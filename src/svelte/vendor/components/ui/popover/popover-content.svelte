<script lang="ts">
  // Adapted from Tres Marías design-system popover-content; Apache-2.0 (vendor/LICENSE).
  import { Popover } from "bits-ui";
  import { cn } from "../../../utils.js";
  import { surfaceFocus } from "@desert/svelte/pieces/surface-focus.svelte.ts";
  import { useSurfaceTypography } from '@desert/svelte/pieces/surface-typography.svelte.ts';
  let { ref = $bindable(null), class: className, onOpenAutoFocus, onCloseAutoFocus, onFocusOutside, presentation = "pane",
    ...props }: Omit<Popover.ContentProps, "child"> & { presentation?: "pane" | "speed-dial" | "reference" | "selection" } = $props();
  const focus = surfaceFocus(() => ref, event => onFocusOutside?.(event));
  const density = useSurfaceTypography();
</script>
<Popover.Portal>
  <Popover.Content bind:ref sideOffset={8} align="start" collisionPadding={12} trapFocus={false} preventScroll={false}
    onOpenAutoFocus={event => focus.open(event, onOpenAutoFocus)}
    onCloseAutoFocus={event => focus.close(event, onCloseAutoFocus)}
    {...props} role={presentation === "speed-dial" ? "dialog" : props.role}
    style={presentation === "selection" ? "padding:.25rem;gap:0;width:max-content" : props.style}
    data-material={presentation !== "speed-dial" ? "pane" : undefined} data-type-density={density()} data-slot="popover-content"
    data-popover-presentation={presentation} class={cn(presentation !== "speed-dial" ? "floating-pane anchored-surface" : "speed-dial",
      presentation === "reference" && "w-[min(24rem,calc(100dvw-24px))] max-h-[calc(100dvh-48px)] overflow-y-auto", className)} />
</Popover.Portal>
