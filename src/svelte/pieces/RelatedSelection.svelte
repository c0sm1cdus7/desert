<script lang="ts">
  import type { RelatedSelectionSnapshot, RelatedSelectionEvent } from '../../interaction/related-selection.ts';
  import StackLayout from './StackLayout.svelte';
  import GroupedPanel from './GroupedPanel.svelte';
  import ChoiceList from './ChoiceList.svelte';
  import ChoiceRow from './ChoiceRow.svelte';
  import Feedback from './Feedback.svelte';
  import Information from './Information.svelte';
  import Image from './media/Image.svelte';
  import ArtworkPlaceholder from './media/ArtworkPlaceholder.svelte';
  import { Checkbox } from '../vendor/components/ui/checkbox/index.js';
  import { Button } from '../vendor/components/ui/button/index.js';
  let {state,onevent}:{state:RelatedSelectionSnapshot;onevent:(event:RelatedSelectionEvent)=>void}=$props();
  const id=$props.id();
</script>
{#each state.groups as group (group.input)}
  <StackLayout title={group.label}>
    {#if group.items.length}<GroupedPanel><ChoiceList><div data-grouped-rows>
      {#each group.items as item (item.id)}
        <ChoiceRow id={`${id}:${item.id}`} labelId={`${id}:${item.id}:label`} label={item.label}
          disabled={group.disabled || state.busy || state.uncertain || state.committing || group.loading}>
          <Checkbox id={`${id}:${item.id}`} checked={item.checked} aria-labelledby={`${id}:${item.id}:label`}
            disabled={group.disabled || state.busy || state.uncertain || state.committing || group.loading}
            onCheckedChange={checked=>onevent({kind:'related.change',input:group.input,id:item.id,checked:checked===true})}/>
          {#if item.asset}<span class="related-preview">
            {#if item.asset.media==='video' || item.asset.media==='audio'}<ArtworkPlaceholder kind={item.asset.media}/>
            {:else}<Image source={item.asset} alt={item.label} edge={96}/>{/if}
          </span>{/if}
        </ChoiceRow>
      {/each}
    </div></ChoiceList></GroupedPanel>
    {:else if group.loading}<Information items={[{kind:'text',text:'Loading items…'}]}/>
    {:else if !group.error}<GroupedPanel><Information items={[{kind:'text',text:'No media available yet.'}]}/></GroupedPanel>{/if}
    {#if group.error}<Feedback text={group.error}/>
      <Button variant="secondary" disabled={group.disabled || state.busy} onclick={()=>onevent({kind:'related.recover',input:group.input})}>{group.uncertain?'Check result':'Try again'}</Button>
    {/if}
  </StackLayout>
{/each}
<style>
  .related-preview{display:block;width:4rem;height:3rem;border-radius:.5rem;overflow:hidden;flex-shrink:0;}
</style>
