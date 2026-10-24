<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  let { kind, id, layout, inset = false, children }: CatalogProps<"view-region"> = $props();
</script>

{#if kind === "view"}
  <!-- The place content column (place.css) frames a view unless the view hosts a catalog; slice 4 folds it into the surface. -->
  <div class:place-content={inset} data-content-layout={layout} data-view-content={id}>{@render children?.()}</div>
{:else if kind === "item"}
  <div data-view-item={id}>{@render children?.()}</div>
{:else}
  {@render children?.()}
{/if}
