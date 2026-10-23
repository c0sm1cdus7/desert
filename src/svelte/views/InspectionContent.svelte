<script lang="ts">
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import type { PublicBankInput } from "../explorer/PublicCatalogBank-model.ts";
  import { Inspection } from "../adapter-catalog.ts";
  let { catalog }: { catalog?: PublicBankInput } = $props();
  let content = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> }>();
  export async function revealEntry(id: PrimitiveId) { return await content?.revealEntry(id) ?? null; }
</script>

<Inspection {catalog} bind:this={content} />
