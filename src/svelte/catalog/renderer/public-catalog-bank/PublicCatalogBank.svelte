<script lang="ts">
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
  import { InspectionCatalog } from "../../../adapter-catalog.ts";
  import type { RegisterContentActions } from "../../../infra/workspace-content.ts";
  let { surface, oncatalog, bodyOnly, onactions }: {
    surface: PublicBankInput; oncatalog: (event: NodeEvent) => void; bodyOnly?: boolean;
    onactions?: RegisterContentActions;
  } = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<HTMLElement | null>;
    revealAndFocusEntry: (id: ResolvedNodeId) => Promise<void> }>();
  export async function revealEntry(id: ResolvedNodeId) { return await content?.revealEntry(id) ?? null; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await content?.revealAndFocusEntry(id); }, selectMedia: () => false });
    return () => register?.(null);
  });
</script>

<InspectionCatalog {surface} {oncatalog} {bodyOnly} bind:this={content} />
