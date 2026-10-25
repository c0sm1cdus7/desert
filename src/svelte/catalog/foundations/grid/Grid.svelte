<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { tracks, gap, children }: CatalogProps<"grid"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every recipe and step.
  const recipes = {
    tiles: "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]",
    collections: "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]",
    cards: "grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))]",
    covers: "grid-cols-3",
    // Search results: three equal columns, one when the space the grid's container gives it is narrower than 37.75rem.
    results: "grid-cols-3 @max-[37.75rem]:grid-cols-1",
  } as const;
  const gaps = { snug: "gap-snug", close: "gap-close", regular: "gap-regular", relaxed: "gap-relaxed", section: "gap-section" } as const;
</script>

{#if tracks === "results"}
  <div class="@container min-w-0"><div class="grid min-w-0 {recipes[tracks]} {gaps[gap]}">{@render children?.()}</div></div>
{:else}
  <div class="grid min-w-0 {recipes[tracks]} {gaps[gap]}">{@render children?.()}</div>
{/if}
