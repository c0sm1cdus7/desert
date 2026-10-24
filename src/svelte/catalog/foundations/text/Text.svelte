<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { text, kind, inset }: CatalogProps<"text"> = $props();
  const kinds = { body: "type-body" } as const, insets = { none: "", row: "px-4" } as const;
</script>

<p class="{kinds[kind]} min-w-0 {insets[inset]}">{text}</p>
