<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { InspectionCatalog } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { surface, oncatalog, bodyOnly, onactions }: CatalogProps<"public-catalog-bank"> = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<HTMLElement | null>;
    revealAndFocusEntry: (id: ResolvedNodeId) => Promise<void> }>();
  export async function revealEntry(id: ResolvedNodeId) { return await content?.revealEntry(id) ?? null; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await content?.revealAndFocusEntry(id); }, selectMedia: () => false });
    return () => register?.(null);
  });
</script>

<InspectionCatalog {surface} oncatalog={event => oncatalog?.(event)} {bodyOnly} bind:this={content} />
