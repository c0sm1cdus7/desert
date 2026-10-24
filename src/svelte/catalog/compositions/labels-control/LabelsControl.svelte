<script lang="ts">
  import * as Field from '../../../vendor/components/ui/field/index.js';
  import * as Popover from '../../../vendor/components/ui/popover/index.js';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { NodeRenderer } from '../../index.ts';
  import { Field as WritingField } from '../../index.ts';
  import { CharacterCounter } from '../../index.ts';
  import { StackLayout } from '../../index.ts';
  import { LabelRail } from '../../index.ts';
  import { ReferenceSelector } from '../../index.ts';
  import { MediaReferenceSelector } from '../../index.ts';
  import type { CatalogProps } from '../../types.d.ts';
  import { addWrittenLabel } from '../../../../interaction/label-writing.ts';
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  let {node,onevent}:CatalogProps<'labels-control'>=$props();
  const id=$props.id();
  let writing=$state(''),feedback=$state(''),open=$state(false);
  dismissWhenInactive(()=>open=false);
  function add(){
    const result=addWrittenLabel(node,writing);
    if(!result.added){feedback=result.message;return;}
    onevent?.({kind:'labels.change',control:node.id,values:result.values});writing='';feedback='';open=false;
  }
</script>
{#if node.mediaReference}<MediaReferenceSelector {node} {onevent}/>{:else if node.reference}<ReferenceSelector {node} {onevent}/>{:else}
<Field.FieldSet><Field.FieldLegend variant="label">{node.label}</Field.FieldLegend>
  {#if node.values.length}<LabelRail values={node.values} disabled={node.disabled}
    onremove={index=>onevent?.({kind:'labels.change',control:node.id,values:node.values.filter((_,position)=>position!==index)})}/>{/if}
  <Popover.Root bind:open><NodeRenderer node={{version:'desert.bank-node/1',kind:'action',role:'secondary',action:{label:'Add label',icon:'create',state:node.disabled || node.values.length>=node.limits.maxItems ? 'unavailable' : 'ready',intent:{kind:'transient.open'}}}}
    actionDisclosure={{id:`${id}-add`,controls:`${id}-new-label`,expanded:open,haspopup:'dialog'}}
    onevent={event=>{if(event.kind==='local.invoke'&&event.intent.kind==='transient.open')open=!open;}}/>
  <Popover.Content id={`${id}-new-label`} customAnchor={`#${id}-add`} presentation="reference"><form onsubmit={event=>{event.preventDefault();add();}}><StackLayout title="New label">
    <WritingField primitive="input.text" label="Label" labelVisibility="visible" measure="writing" purpose="text" value={writing} required={false}
      invalid={false} disabled={false} maxLength={node.limits.maxLength} clear onchange={value=>writing=value}/>
    <CharacterCounter id={`${id}-counter`} value={writing} maxLength={node.limits.maxLength}/>
    {#if feedback}<Field.FieldError>{feedback}</Field.FieldError>{/if}
    <Button type="submit" disabled={!writing.trim() || node.disabled}>Add label</Button>
  </StackLayout></form></Popover.Content></Popover.Root>
  {#if node.error}<Field.FieldError>{node.error}</Field.FieldError>{/if}
</Field.FieldSet>
{/if}
