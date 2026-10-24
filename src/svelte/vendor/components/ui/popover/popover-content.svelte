<script lang="ts">
  // Adapted from Tres Marías design-system popover-content; Apache-2.0 (vendor/LICENSE).
  // The owner (popover) passes its type density, its focus handlers and its dismissal; the content only places the pane.
  import { Popover } from "bits-ui";
  import { cn } from "../../../utils.js";
  let { ref = $bindable(null), class: className, presentation = "pane", density, ...props }: Omit<Popover.ContentProps, "child"> & {
    presentation?: "pane" | "speed-dial" | "reference" | "selection"; density?: "comfortable" | "compact" | undefined;
  } = $props();
</script>
<Popover.Portal>
  <Popover.Content bind:ref sideOffset={8} align="start" collisionPadding={12} trapFocus={false} preventScroll={false}
    {...props} role={presentation === "speed-dial" ? "dialog" : props.role}
    style={presentation === "selection" ? "padding:.25rem;gap:0;width:max-content" : props.style}
    data-material={presentation !== "speed-dial" ? "pane" : undefined} data-type-density={density} data-slot="popover-content"
    data-popover-presentation={presentation} class={cn(presentation !== "speed-dial" ? "floating-pane anchored-surface" : "speed-dial",
      presentation === "reference" && "w-[min(24rem,calc(100dvw-24px))] max-h-[calc(100dvh-48px)] overflow-y-auto", className)} />
</Popover.Portal>
