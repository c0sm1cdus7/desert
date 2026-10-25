<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { tracks, gap, children }: CatalogProps<"grid"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every recipe and step.
  const recipes = {
    tiles: "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]",
    collections: "grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]",
    cards: "grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))]",
    // Covers: at most three equal columns, each at least a cover wide (a rail card's width), so as many fit as the grid's
    // container holds; narrower than one cover, one column fills the grid.
    covers: "grid-cols-[repeat(auto-fill,minmax(min(100%,max(var(--catalog-media-height)_*_var(--catalog-cover-aspect),(100%_-_2_*_var(--grid-gap))_/_3)),1fr))]",
    // Search results: three equal columns, one when the space the grid's container gives it is narrower than 37.75rem.
    results: "grid-cols-3 @max-[37.75rem]:grid-cols-1",
  } as const;
  // Each step also names the gap the covers recipe counts its columns with.
  const gaps = { tight: "gap-tight [--grid-gap:var(--spacing-tight)]", snug: "gap-snug [--grid-gap:var(--spacing-snug)]",
    close: "gap-close [--grid-gap:var(--spacing-close)]", regular: "gap-regular [--grid-gap:var(--spacing-regular)]",
    loose: "gap-loose [--grid-gap:var(--spacing-loose)]", relaxed: "gap-relaxed [--grid-gap:var(--spacing-relaxed)]",
    section: "gap-section [--grid-gap:var(--spacing-section)]" } as const;
  // A piece is laid out in its own track: never wider than it, so it never draws over its neighbour or past the grid.
  const cells = "*:min-w-0 *:max-w-full";
</script>

{#if tracks === "results"}
  <div class="@container min-w-0"><div class="grid min-w-0 {recipes[tracks]} {gaps[gap]} {cells}">{@render children?.()}</div></div>
{:else}
  <div class="grid min-w-0 {recipes[tracks]} {gaps[gap]} {cells}">{@render children?.()}</div>
{/if}
