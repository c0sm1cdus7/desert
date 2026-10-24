<script lang="ts">
  import { StackLayout } from "../../index.ts";
  import { GroupedPanel } from "../../index.ts";
  import { DestinationRow } from "../../index.ts";
  import { Information } from "../../index.ts";
  import { ToolbarLayout } from "../../index.ts";
  import { PlaceHeader } from "../../index.ts";
  import { SharedOwnerSpecimen } from "../../index.ts";
  import { CatalogSources } from "../../sources.ts";
  import { sharedOwnerPieces } from "../../../infra/shared-owners.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { sharedPurpose, sharedParts } from '../../../infra/shared-purpose.ts';
  let { selected, hosted, onselect }: CatalogProps<"shared-owner-catalog">=$props();
</script>
<div data-shared-owner-catalog class="grid min-w-0 gap-8">
  {#if selected}
    {#if !hosted}
      <ToolbarLayout content={{kind:"place-navigation",detail:true,onback:()=>onselect?.(null)}} />
      <PlaceHeader title={sharedPurpose[selected].title} subtitle={sharedPurpose[selected].purpose} />
    {/if}
    <StackLayout title="Example"><SharedOwnerSpecimen owner={selected} /></StackLayout>
    {#if sharedParts(selected).length}<StackLayout title="Composition parts"><GroupedPanel><div data-grouped-rows>
      {#each sharedParts(selected) as id}<DestinationRow destination={id} label={sharedPurpose[id].title} icon="catalog" available open={()=>onselect?.(id)} />{/each}
    </div></GroupedPanel></StackLayout>{/if}
    <StackLayout title="Contract"><Information items={[
      {kind:"fact",label:"Owner",value:selected},
      {kind:"fact",label:"Source",value:CatalogSources[sharedOwnerPieces[selected]]},
    ]} /></StackLayout>
  {/if}
</div>
