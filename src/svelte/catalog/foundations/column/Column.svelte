<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { gap, measure, align = "stretch", children }: CatalogProps<"column"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step; each length is the theme's spacing token.
  const gaps = { snug: "gap-snug", close: "gap-close", regular: "gap-regular", relaxed: "gap-relaxed", section: "gap-section" } as const;
  const aligns = { start: "justify-items-start", center: "justify-items-center text-center", stretch: "" } as const;
  const measures = { reading: "w-full max-w-[34rem]", narrow: "mx-auto w-[min(100%,30rem)]", wide: "w-full max-w-[52rem]" } as const;
</script>

<div class="grid min-w-0 break-words {gaps[gap]} {aligns[align]} {measure ? measures[measure] : ''}"
  data-reading-measure={measure === "reading" ? "" : undefined}>{@render children?.()}</div>
