<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { Inspection } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { catalog }: CatalogProps<"inspection-content"> = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean> }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await content?.revealEntry(id) ?? false; }
</script>

<Inspection {catalog} bind:this={content} />
