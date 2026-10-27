<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { catalogTitle } from "../../../infra/catalog-entries.ts";
  import { Choice, Column, ContractInspection, StackLayout, Text, ViewRegion } from "../../index.ts";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import { provideSpecimenState } from "../../../infra/specimen-state.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { id, hidden = false, children }: CatalogProps<"specimen-group"> = $props();
  let entry = $derived(ResolvedNodes.entries.find(item => item.id === id)!);
  let selected = $state<string | null>(null);
  let active = $derived(selected ?? entry.states[0]!);
  provideSpecimenState(() => active);
</script>

<!-- The entry's region, `entry:<id>`: the bank reveals it by that id, and its rows show only the chosen state. -->
<ViewRegion kind="item" id={`entry:${id}`} label={id} visible={!hidden}>
  <Column gap="close">
    <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.specimenGroup.state)} labelVisibility="visible"
      options={entry.states.map(value => ({ value, label: value, disabled: false }))} selected={[active]} disabled={false}
      required={false} onchange={next => { selected = next[0] ?? null; }} />
    <StackLayout title={say(m.specimenGroup.examples, { title: catalogTitle(id) })}>
      <Column gap="relaxed">
        {@render children?.()}
        {#if active === "loading"}<Text kind="support" live="polite" text={say(m.specimenGroup.loading)} />
        {:else if active === "offline"}<Text kind="support" live="polite" text={say(m.specimenGroup.offline)} />{/if}
      </Column>
    </StackLayout>
    <ContractInspection {id} />
  </Column>
</ViewRegion>
