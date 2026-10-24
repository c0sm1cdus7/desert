<script lang="ts">
  import * as Popover from '../../../vendor/components/ui/popover/index.js';
  import * as Field from '../../../vendor/components/ui/field/index.js';
  import { Checkbox } from '../../../vendor/components/ui/checkbox/index.js';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { ChoiceList } from '../../index.ts';
  import { ChoiceRow } from '../../index.ts';
  import { StackLayout } from '../../index.ts';
  import { FieldWellContent } from '../../index.ts';
  import { ReferenceValues } from '../../index.ts';
  import { ColorBullet } from '../../index.ts';
  import { TextInput } from '../../index.ts';
  import { SelectionField } from '../../index.ts';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import type { CatalogProps } from '../../types.d.ts';
  let {node,onevent}:CatalogProps<'reference-selector'>=$props();
  const id=$props.id();
  let open=$state(false);
  let creating=$state(false), name=$state(''), color=$state(''), submitted=$state(false), observedBusy=$state(false);
  let reference=$derived(node.reference!);
  let locked=$derived(Boolean(node.disabled || reference.busy || reference.uncertain));
  let triggerLocked=$derived(reference.busy || (node.disabled && !reference.uncertain));
  dismissWhenInactive(()=>{open=false;});
  $effect(()=>{if(node.disabled && !reference.busy && !reference.uncertain)open=false;});
  $effect(()=>{
    if(submitted && reference.busy)observedBusy=true;
    if(submitted && observedBusy && !reference.busy){
      submitted=false;observedBusy=false;
      if(!reference.error && !reference.uncertain){creating=false;name='';}
    }
  });
  function create() {
    if(locked || !reference.createLabel || !name.trim() || name.trim().length>reference.maxLength || node.values.length>=node.limits.maxItems)return;
    submitted=true;
    onevent?.({kind:'reference.create',control:node.id,name:name.trim(),...(reference.colors.length ? {color:color || reference.colors[0]!} : {})});
  }
  function choose(value:string,checked:boolean) {
    if (locked) return;
    onevent?.({kind:'labels.change',control:node.id,values:checked ? [...node.values,value] : node.values.filter(item=>item!==value)});
  }
</script>
<Field.Field>
<Popover.Root bind:open onOpenChange={next=>{if(next)onevent?.({kind:'reference.refresh',control:node.id});}}>
  <Popover.Trigger disabled={triggerLocked} presentation="reference-well" aria-label={node.label}>
        <FieldWellContent label={node.label}>
          <span data-field-value>
            {#if node.values.length}<ReferenceValues values={node.values} options={reference.options}/>{:else}<span>Choose…</span>{/if}
            <span data-control-chevron><ChevronDown aria-hidden="true"/></span>
          </span>
        </FieldWellContent>
  </Popover.Trigger>
  <Popover.Content presentation="reference">
    <StackLayout title={node.label}>
      {#if reference.loading}<Field.FieldDescription>Loading…</Field.FieldDescription>{/if}
      {#if reference.options.length}<ChoiceList><div data-grouped-rows>
        {#each reference.options as option (option.value)}
          <ChoiceRow id={`${id}:${option.value}`} labelId={`${id}:${option.value}:label`} label={option.label}
            disabled={locked || (!node.values.includes(option.value) && node.values.length>=node.limits.maxItems)}>
            <Checkbox id={`${id}:${option.value}`} checked={node.values.includes(option.value)}
              disabled={locked || (!node.values.includes(option.value) && node.values.length>=node.limits.maxItems)}
              onCheckedChange={checked=>choose(option.value,checked)} aria-labelledby={`${id}:${option.value}:label`}/>
            {#if option.color}<ColorBullet color={option.color}/>{/if}
          </ChoiceRow>
        {/each}
      </div></ChoiceList>{:else if !reference.loading && !reference.error}
        <Field.FieldDescription>No options available.</Field.FieldDescription>
      {/if}
      {#if reference.error}<Field.FieldError>{reference.error}</Field.FieldError>{/if}
      {#if reference.createLabel}
        {#if reference.uncertain}
          <Button variant="secondary" disabled={reference.busy} onclick={()=>onevent?.({kind:'reference.recover',control:node.id})}>Check result</Button>
        {:else if creating}
          <TextInput primitive="input.text" label="Name" value={name} required maxLength={reference.maxLength} disabled={locked} onchange={value=>name=value}/>
          {#if reference.colors.length}<SelectionField selection={`${node.id}:color`} label="Color" fieldControl value={color || reference.colors[0]!}
            options={reference.colors.map(value=>({value,label:value[0]!.toUpperCase()+value.slice(1),disabled:false}))} disabled={locked} onchange={value=>color=value}/>{/if}
          <Button variant="secondary" disabled={locked} onclick={()=>{creating=false;name='';}}>Cancel</Button>
          <Button variant="default" disabled={locked || !name.trim() || name.trim().length>reference.maxLength} onclick={create}>{reference.createLabel}</Button>
        {:else}
          <Button variant="secondary" disabled={locked || node.values.length>=node.limits.maxItems} onclick={()=>creating=true}>{reference.createLabel}</Button>
        {/if}
      {/if}
    </StackLayout>
  </Popover.Content>
</Popover.Root>
{#if node.error}<Field.FieldError>{node.error}</Field.FieldError>{/if}
</Field.Field>
