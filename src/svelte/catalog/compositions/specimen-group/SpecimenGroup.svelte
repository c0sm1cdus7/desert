<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { catalogTitle } from "../../../infra/catalog-navigation.ts";
  import { ContractInspection } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import { SelectionField } from "../../index.ts";
  import { MeasuredField } from "../../index.ts";
  import { Feedback } from "../../index.ts";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import { provideSpecimenState } from "../../../infra/specimen-state.ts";
  let { id, hidden = false, headingLevel = 3, children }: {
    id: ResolvedNodeId; hidden?: boolean; headingLevel?: 2 | 3; children: Snippet;
  } = $props();
  const instance=$props.id();
  let entry=$derived(ResolvedNodes.entries.find(item=>item.id===id)!);
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
