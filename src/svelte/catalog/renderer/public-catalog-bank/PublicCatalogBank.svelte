<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { InspectionCatalog } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { surface, oncatalog, bodyOnly = false, onactions }: CatalogProps<"public-catalog-bank"> = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean> }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await content?.revealEntry(id) ?? false; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await content?.revealEntry(id); }, selectMedia: () => false });
    return () => register?.(null);
  });
</script>

<InspectionCatalog {surface} oncatalog={event => oncatalog?.(event)} {bodyOnly} bind:this={content} />
