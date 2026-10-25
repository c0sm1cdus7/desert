<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { gap, measure, align = "stretch", inset, leading = false, fill = false, children }: CatalogProps<"column"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step; each length is the theme's spacing token.
  const gaps = { snug: "gap-snug", close: "gap-close", regular: "gap-regular", loose: "gap-loose", relaxed: "gap-relaxed", section: "gap-section" } as const;
  const aligns = { start: "justify-items-start", center: "justify-items-center text-center", stretch: "" } as const;
  const measures = { reading: "w-full max-w-[34rem]", narrow: "mx-auto w-[min(100%,30rem)]", wide: "w-full max-w-[52rem]" } as const;
  // The place's insets (surface geometry): the content inset, a reading block's padding around pieces at the row inset, or a
  // section's block padding.
  const insets = { content: "px-[var(--place-content-inset,42px)]", reading: "pt-6 pb-12 px-[calc(var(--place-content-inset,26px)-1rem)]", section: "py-6" } as const;
  // A filling column is a flex column at least as tall as its container, so a block that grows (a status) takes the rest.
  let layout = $derived(fill ? "flex min-h-full flex-col" : "grid");
</script>

<div class="{layout} min-w-0 break-words {gaps[gap]} {aligns[align]} {measure ? measures[measure] : ''} {inset ? insets[inset] : ''} {leading ? 'ms-[var(--place-leading-inset,0px)]' : ''}"
  data-reading-measure={measure === "reading" ? "" : undefined}>{@render children?.()}</div>
