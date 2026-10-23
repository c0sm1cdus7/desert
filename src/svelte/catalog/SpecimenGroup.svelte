<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogTitle } from "./navigation.ts";
  import ContractInspection from "./ContractInspection.svelte";
  import StackLayout from "../pieces/StackLayout.svelte";
  import SelectionField from "../pieces/SelectionField.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import Feedback from "../pieces/Feedback.svelte";
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import { provideSpecimenState } from "./specimen-state.ts";
  let { id, hidden = false, headingLevel = 3, children }: {
    id: PrimitiveId; hidden?: boolean; headingLevel?: 2 | 3; children: Snippet;
  } = $props();
  const instance=$props.id();
  let entry=$derived(InteractionCatalog.entries.find(item=>item.id===id)!);
  let selected=$state<string|null>(null);
  let active=$derived(selected??entry.states[0]!);
  provideSpecimenState(()=>active);
</script>

<section data-catalog-entry={id} aria-label={id} class="flex min-w-0 flex-col gap-3" {hidden}>
    <MeasuredField kind="control.select"><SelectionField selection={instance} label="State" value={active} fieldControl
      options={entry.states.map(value=>({value,label:value,disabled:false}))} onchange={value=>selected=value} /></MeasuredField>
    <StackLayout title={`${catalogTitle(id)} · Examples`}>
    <div data-specimen-group={id} class="place-stack-content flex min-w-0 flex-col gap-6">
      {@render children()}
      {#if active==='loading'}<Feedback text="Connecting to the controller. Dependent commands wait until their availability is known." />
      {:else if active==='offline'}<Feedback text="Offline. Existing reading and local drafts are retained; controller-dependent choices and commits are unavailable until reconnection." />{/if}
    </div>
    </StackLayout>
    <ContractInspection {id} />
</section>
