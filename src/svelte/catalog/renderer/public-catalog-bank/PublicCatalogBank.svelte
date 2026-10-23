<script lang="ts">
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../../../interaction/catalog.ts";
  import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
  import { InspectionCatalog } from "../../../adapter-catalog.ts";
  import type { RegisterContentActions } from "../../../infra/workspace-content.ts";
  let { surface, oncatalog, bodyOnly, onactions }: {
    surface: PublicBankInput; oncatalog: (event: BankEvent) => void; bodyOnly?: boolean;
    onactions?: RegisterContentActions;
  } = $props();
  let content = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null>;
    revealAndFocusEntry: (id: PrimitiveId) => Promise<void> }>();
  export async function revealEntry(id: PrimitiveId) { return await content?.revealEntry(id) ?? null; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await content?.revealAndFocusEntry(id); }, selectMedia: () => false });
    return () => register?.(null);
  });
</script>

<InspectionCatalog {surface} {oncatalog} {bodyOnly} bind:this={content} />
