<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { gap, align = "center", justify = "start", overflow, label, children }: CatalogProps<"inline"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step; each gap length is the theme's spacing token.
  const gaps = { tight: "gap-tight", snug: "gap-snug", cozy: "gap-cozy", close: "gap-close", near: "gap-near", regular: "gap-regular", loose: "gap-loose", airy: "gap-airy", relaxed: "gap-relaxed", ample: "gap-ample", section: "gap-section" } as const;
  const aligns = { start: "items-start", center: "items-center", baseline: "items-baseline", end: "items-end" } as const;
  const justifies = { start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between" } as const;
  // A scroll rail runs to the surface's edge (over the margin of a page it is shown in, --place-bleed), its first piece at
  // the surface inset, and hides its scrollbar; its pieces keep their own width.
  const overflows = { wrap: "flex-wrap", none: "flex-nowrap",
    scroll: "flex-nowrap overflow-x-auto mx-[calc(-1*var(--place-bleed,0px))] px-[calc(var(--place-surface-inset,26px)+var(--place-bleed,0px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" } as const;
</script>

<div class="flex min-w-0 {gaps[gap]} {aligns[align]} {justifies[justify]} {overflows[overflow]}"
  role={overflow === "scroll" ? "region" : undefined} aria-label={label}>{@render children?.()}</div>
