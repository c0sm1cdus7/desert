<script lang="ts">
  import { untrack, type Snippet } from "svelte";
  import { InteractionCatalog, type PrimitiveId } from "../../interaction/catalog.ts";
  import { scopeHeadings } from "../pieces/heading-context.ts";
  import StackItem from "../pieces/StackItem.svelte";
  import { useSpecimenState } from "./specimen-state.ts";
  let { id, state, coverage, headingLevel = 3, children }: {
    id: PrimitiveId;
    state: string;
    coverage?: "gap" | "rendered";
    divided?: boolean;
    headingLevel?: 2 | 3;
    children: Snippet;
  } = $props();
  // The catalog outline is fixed for this specimen's mounted lifetime.
  scopeHeadings(untrack(() => headingLevel));
  let fixture = $derived(InteractionCatalog.entries.find(entry => entry.id === id)!.inspection.fixtures.find(item => item.state === state)!);
  const selection=useSpecimenState();
</script>

<article data-specimen={fixture.id} data-fixture-owner={fixture.owner} data-bank-coverage={coverage ?? "rendered"}
  hidden={selection !== undefined && selection() !== state}
  class="flex min-w-0 flex-col gap-2">
  <StackItem kind={id}>{@render children()}</StackItem>
</article>
