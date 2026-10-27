<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { size }: CatalogProps<"spacer"> = $props();
  // Literal class names, so the theme's Tailwind scan sees every step; each length is the theme's spacing token.
  const sizes = { snug: "size-snug shrink-0", close: "size-close shrink-0", regular: "size-regular shrink-0", relaxed: "size-relaxed shrink-0",
    section: "size-section shrink-0", fill: "min-h-0 min-w-0 flex-1 self-stretch" } as const;
</script>

<div class={sizes[size]} aria-hidden="true"></div>
