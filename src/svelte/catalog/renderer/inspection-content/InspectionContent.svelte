<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
  import { Inspection } from "../../../adapter-catalog.ts";
  let { catalog }: { catalog?: PublicBankInput } = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<HTMLElement | null> }>();
  export async function revealEntry(id: ResolvedNodeId) { return await content?.revealEntry(id) ?? null; }
</script>

<Inspection {catalog} bind:this={content} />
