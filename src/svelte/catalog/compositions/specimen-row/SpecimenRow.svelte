<script lang="ts">
  import { untrack } from "svelte";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { scopeHeadings } from "../../../infra/heading-context.ts";
  import { StackItem } from "../../index.ts";
  import { useSpecimenState } from "../../../infra/specimen-state.ts";
  let { id, state, coverage, headingLevel = 3, children }: CatalogProps<"specimen-row"> = $props();
  // The catalog outline is fixed for this specimen's mounted lifetime.
  scopeHeadings(untrack(() => headingLevel));
  let fixture = $derived(ResolvedNodes.entries.find(entry => entry.id === id)!.inspection.fixtures.find(item => item.state === state)!);
  const selection=useSpecimenState();
</script>

<article data-specimen={fixture.id} data-fixture-owner={fixture.owner} data-bank-coverage={coverage ?? "rendered"}
  hidden={selection !== undefined && selection() !== state}
  class="flex min-w-0 flex-col gap-2">
  <StackItem kind={id}>{@render children?.()}</StackItem>
</article>
