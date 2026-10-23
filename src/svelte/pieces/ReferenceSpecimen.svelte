<script lang="ts">
  import LabelRail from './LabelRail.svelte';
  import ColorBullet from './ColorBullet.svelte';
  import ReferenceValues from './ReferenceValues.svelte';
  import ReferenceSelector from './ReferenceSelector.svelte';
  import LabelsControl from './LabelsControl.svelte';
  import type { LabelsNode, ReferenceEvent } from '../../interaction/labels-control.ts';
  let {owner}:{owner:'LabelRail'|'ColorBullet'|'ReferenceValues'|'ReferenceSelector'|'LabelsControl'}=$props();
  let labels=$state(['Design','Research']);
  let node=$state<LabelsNode>({version:'desert.control/1',kind:'labels',id:'projects',label:'Projects',disabled:false,
    values:['10000000-0000-4000-8000-000000000001'],limits:{maxItems:12,maxLength:36},
    reference:{options:[{value:'10000000-0000-4000-8000-000000000001',label:'Personal',color:'blue'},
      {value:'10000000-0000-4000-8000-000000000002',label:'VOID',color:'rose'}],loading:false,busy:false,uncertain:false,
      colors:['blue','violet','rose','green','amber','slate'],maxLength:64}});
  function event(event:ReferenceEvent | {kind:'labels.change';control:string;values:readonly string[]}) {
    if(event.kind==='labels.change'){node={...node,values:event.values};return;}
  }
</script>
{#if owner==='LabelRail'}<LabelRail values={labels} onremove={index=>labels=labels.filter((_,position)=>position!==index)}/>
{:else if owner==='ColorBullet'}<ColorBullet color="rose"/>
{:else if owner==='ReferenceValues'}<ReferenceValues values={node.values} options={node.reference!.options}/>
{:else if owner==='ReferenceSelector'}<ReferenceSelector {node} onevent={event}/>
{:else}<LabelsControl node={{version:'desert.control/1',kind:'labels',id:'labels',label:'Labels',disabled:false,
  values:labels,limits:{maxItems:12,maxLength:64}}} onevent={event=>{if(event.kind==='labels.change')labels=[...event.values];}}/>{/if}
