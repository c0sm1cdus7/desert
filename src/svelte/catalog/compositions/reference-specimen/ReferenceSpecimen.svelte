<script lang="ts">
  import { ColorBullet, Inline, LabelsControl, ReferenceSelector, Tag } from '../../index.ts';
  import type { LabelsNode, ReferenceEvent } from '../../../../interaction/labels-control.ts';
  import type { CatalogProps } from '../../types.d.ts';
  import { say } from '../../../infra/messages.ts';
  import { m } from '../../../../messages/keys.ts';
  let {owner}:CatalogProps<'reference-specimen'>=$props();
  let labels=$state(['Design','Research']);
  const options=[{value:'10000000-0000-4000-8000-000000000001',label:'Personal',color:'blue'},
    {value:'10000000-0000-4000-8000-000000000002',label:'VOID',color:'rose'}] as const;
  let node=$state<LabelsNode>({version:'desert.control/1',kind:'labels',id:'projects',label:'Projects',disabled:false,
    values:['10000000-0000-4000-8000-000000000001'],limits:{maxItems:12,maxLength:36},
    reference:{options,loading:false,busy:false,uncertain:false,colors:['blue','violet','rose','green','amber','slate'],maxLength:64}});
  function event(event:ReferenceEvent | {kind:'labels.change';control:string;values:readonly string[]}) {
    if(event.kind==='labels.change'){node={...node,values:event.values};return;}
  }
  // A reference reads as its option's name beside its color, or as unavailable when no option names it.
  let references=$derived(node.values.map(value=>({value,option:options.find(item=>item.value===value)})));
</script>
{#if owner==='LabelRail'}
  <Inline gap="snug" overflow="wrap">
    {#each labels as value,index (index)}<Tag presentation="chip" tone="neutral" label={value} state="known" removable
      removeLabel={say(m.referenceSpecimen.remove, { label: value })} disabled={false} onremove={()=>labels=labels.filter((_,position)=>position!==index)} />{/each}
  </Inline>
{:else if owner==='ColorBullet'}<ColorBullet color={options[1].color} />
{:else if owner==='ReferenceValues'}
  <Inline gap="snug" overflow="wrap">
    {#each references as {value,option} (value)}
      {#if option}<Tag presentation="text" label={option.label} color={option.color} state="known" removable={false} disabled={false} />
      {:else}<Tag presentation="text" label={say(m.referenceSpecimen.unavailable)} state="unavailable" removable={false} disabled={false} />{/if}
    {/each}
  </Inline>
{:else if owner==='ReferenceSelector'}<ReferenceSelector {node} onevent={event}/>
{:else}<LabelsControl node={{version:'desert.control/1',kind:'labels',id:'labels',label:'Labels',disabled:false,
  values:labels,limits:{maxItems:12,maxLength:64}}} onevent={event=>{if(event.kind==='labels.change')labels=[...event.values];}}/>{/if}
