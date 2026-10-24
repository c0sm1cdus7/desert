<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { StackLayout } from '../../index.ts';
  import { GroupedPanel } from '../../index.ts';
  import { ChoiceList } from '../../index.ts';
  import { ChoiceRow } from '../../index.ts';
  import { Feedback } from '../../index.ts';
  import { Information } from '../../index.ts';
  import { Image } from '../../index.ts';
  import { ArtworkPlaceholder } from '../../index.ts';
  import { Checkbox } from '../../../vendor/components/ui/checkbox/index.js';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  let { state, onevent }: CatalogProps<"related-selection"> = $props();
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
            onCheckedChange={checked=>onevent?.({kind:'related.change',input:group.input,id:item.id,checked:checked===true})}/>
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
      <Button variant="secondary" disabled={group.disabled || state.busy} onclick={()=>onevent?.({kind:'related.recover',input:group.input})}>{group.uncertain?'Check result':'Try again'}</Button>
    {/if}
  </StackLayout>
{/each}
<style>
  .related-preview{display:block;width:4rem;height:3rem;border-radius:.5rem;overflow:hidden;flex-shrink:0;}
</style>
