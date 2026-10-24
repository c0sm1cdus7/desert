<script lang="ts">
  import { Skeleton } from "../../../vendor/components/ui/skeleton/index.js";
  import { Spinner } from "../../../vendor/components/ui/spinner/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { kind, label }: CatalogProps<"loading"> = $props();
</script>

{#if kind === "lines"}
  <div class="flex w-full flex-col gap-2" data-loading="lines">
    <Skeleton line="primary" aria-hidden="true" /><Skeleton line="secondary" aria-hidden="true" />
    <span class="sr-only" role="status">{label}</span>
  </div>
{:else}
  <span class="inline-flex shrink-0" data-loading="spinner">
    <Spinner aria-hidden="true" /><span class="sr-only" role="status">{label}</span>
  </span>
{/if}
