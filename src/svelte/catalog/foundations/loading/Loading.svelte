<script lang="ts">
  import { Skeleton } from "../../../vendor/components/ui/skeleton/index.js";
  import { Spinner } from "../../../vendor/components/ui/spinner/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { kind, label, inset = "none", id }: CatalogProps<"loading"> = $props();
  // Literal class names, so the theme's Tailwind scan sees both insets; the block inset is a status block's padding.
  const insets = { none: "", block: "p-6" } as const;
</script>

{#if kind === "lines"}
  <div class="flex w-full flex-col gap-2 {insets[inset]}" data-loading="lines" {id}>
    <Skeleton line="primary" aria-hidden="true" /><Skeleton line="secondary" aria-hidden="true" />
    <span class="sr-only" role="status">{label}</span>
  </div>
{:else}
  <span class="inline-flex shrink-0 {insets[inset]}" data-loading="spinner" {id}>
    <Spinner aria-hidden="true" /><span class="sr-only" role="status">{label}</span>
  </span>
{/if}
