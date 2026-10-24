<script lang="ts">
  import { untrack } from "svelte";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { scopeHeadings } from "../../../infra/heading-context.ts";
  import { StackItem, ViewRegion } from "../../index.ts";
  import { stackPlacement } from "../../../infra/stack-placement.ts";
  import { useSpecimenState } from "../../../infra/specimen-state.ts";
  let { id, state, headingLevel = 3, children }: CatalogProps<"specimen-row"> = $props();
  // The catalog outline is fixed for this specimen's mounted lifetime.
  scopeHeadings(untrack(() => headingLevel));
  let fixture = $derived(ResolvedNodes.entries.find(entry => entry.id === id)!.inspection.fixtures.find(item => item.state === state)!);
  const selection = useSpecimenState();
</script>

<!-- The fixture's region, `specimen:<fixture id>`: it names one specimen for navigation and tests. -->
<ViewRegion kind="item" id={`specimen:${fixture.id}`} visible={selection === undefined || selection() === state}>
  <StackItem placement={stackPlacement(id)} kind={id}>{@render children?.()}</StackItem>
</ViewRegion>
