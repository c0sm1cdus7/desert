<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { gap, measure, children }: CatalogProps<"column"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step.
  const gaps = { snug: "gap-2", close: "gap-3", regular: "gap-4", relaxed: "gap-6", section: "gap-8" } as const;
</script>

<div class="grid min-w-0 break-words {gaps[gap]}" data-reading-measure={measure === "reading" ? "" : undefined}>{@render children?.()}</div>
