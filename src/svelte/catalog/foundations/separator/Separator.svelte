<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { orientation, inset }: CatalogProps<"separator"> = $props();
  // Literal class names, so the theme's Tailwind scan sees both orientations and insets.
  const lines = { horizontal: "h-px w-auto", vertical: "w-px self-stretch" } as const;
  const insets = { none: "", row: "ms-4" } as const;
</script>

<div role="separator" aria-orientation={orientation} class="shrink-0 bg-separator {lines[orientation]} {insets[inset]}"></div>
