<script lang="ts">
  import { ResolvedNodes, type ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { Information } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  let { id }: { id: ResolvedNodeId } = $props();
  let inspection = $derived(ResolvedNodes.entries.find(entry => entry.id === id)!.inspection);
  let owners = $derived(inspection.owners.map(owner => ResolvedNodes.foundations.find(item => item.id === owner)!.title));
</script>

<div data-contract-inspection class="grid min-w-0 gap-8">
  <StackLayout title="Contract"><Information items={[
    {kind:"fact",label:"Component",value:id},
    {kind:"fact",label:"Shared owners",value:owners.join(" · ")},
    ...Object.entries(inspection.axes).filter(([,values])=>values.length).map(([axis,values])=>({kind:"fact" as const,label:axis,value:values.join(" · ")})),
    {kind:"fact",label:"Qualification",value:`${inspection.fixtures.length} declared fixtures · partial`},
  ]} /></StackLayout>
  <StackLayout title="Coverage gaps"><Information items={inspection.gaps.map(text=>({kind:"text" as const,text}))} /></StackLayout>
  <StackLayout title="Evidence references"><Information items={inspection.evidence.map(text=>({kind:"text" as const,text}))} /></StackLayout>
</div>
