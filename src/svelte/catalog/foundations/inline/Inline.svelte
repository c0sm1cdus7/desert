<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { gap, align = "center", justify = "start", overflow, label, children }: CatalogProps<"inline"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step; each gap length is the theme's spacing token.
  const gaps = { tight: "gap-tight", snug: "gap-snug", close: "gap-close", regular: "gap-regular", relaxed: "gap-relaxed", section: "gap-section" } as const;
  const aligns = { start: "items-start", center: "items-center", baseline: "items-baseline", end: "items-end" } as const;
  const justifies = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as const;
  // A scroll rail bleeds to the surface inset and hides its scrollbar; its pieces keep their own width.
  const overflows = { wrap: "flex-wrap", none: "flex-nowrap",
    scroll: "flex-nowrap overflow-x-auto px-[var(--place-surface-inset,26px)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" } as const;
</script>

<div class="flex min-w-0 {gaps[gap]} {aligns[align]} {justifies[justify]} {overflows[overflow]}"
  role={overflow === "scroll" ? "region" : undefined} aria-label={label}>{@render children?.()}</div>
