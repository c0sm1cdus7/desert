<script lang="ts">
  // Closed catalog inventory composition: grouping, specimens and instance-local entry handles.
  import { onDestroy, tick } from "svelte";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { catalogGroups } from "../../../infra/catalog-navigation.ts";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import { StackLayout } from "../../index.ts";
  import { GroupedPanel } from "../../index.ts";
  import { DestinationRow } from "../../index.ts";
  import { ToolbarLayout } from "../../index.ts";
  import { catalogTitle } from "../../../infra/catalog-navigation.ts";
  import { SharedOwnerCatalog } from "../../index.ts";
  import type { SharedOwner } from '../../../infra/shared-owners.ts';
  import { sharedPurpose, sharedIndexOwners, sharedParts } from '../../../infra/shared-purpose.ts';
  import { catalogPurpose } from './purpose.ts';
  import { ControlBench } from "../../index.ts";
  import { SpecimenGroup } from "../../index.ts";
  import { SpecimenRow } from "../../index.ts";
  import { SpecimenUnavailable } from "../../index.ts";
  import { PublicCatalogBankSpecimen } from "../../index.ts";
  import { publicCatalogBankInventory, type PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
  import { PlaceHeader } from "../../index.ts";
  import { revealSearchTarget } from "../../../infra/catalog-search-focus.ts";
  import { providePrivateImages } from "../../../infra/private-image-context.ts";
  import { privateImageAccess } from "../../../../web/client/private-images.ts";
  import { destinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  // Inspection owns its installed example asset; this provider cannot resolve
  // any product reference or inherit a signed-in identity's private media.
  const images = privateImageAccess(asset => asset.reference === 'a7000000-0000-4000-8000-000000000001'
    ? { valid: () => true, read: async (_variant, signal) => {
      const response = await fetch('/bank-image.svg', { signal });
      if (!response.ok) throw new Error('SPECIMEN_IMAGE_UNAVAILABLE');
      return response.blob();
    } } : undefined);
  providePrivateImages(images);
  onDestroy(() => images.close());
  let { surface, oncatalog, bodyOnly = false }: {
    surface: PublicBankInput; oncatalog: (event: NodeEvent) => void; bodyOnly?: boolean;
  } = $props();
  let inventory = $derived(publicCatalogBankInventory(surface));
  const entries = ResolvedNodes.entries;
  const navigation = destinationNavigation(), destination = navigation?.destination();
  let localSelected = $state<ResolvedNodeId | null>(null);
  let localShared = $state<SharedOwner|null>(null);
  let sharedHistory = $state<SharedOwner[]>([]);
  let sharedOrigins:SharedOwner[]=[];
  let page = $derived(destination ? navigation?.current(destination) : undefined);
  let selected = $derived(page?.id.startsWith("component:") ? page.id.slice(10) as ResolvedNodeId
    : navigation || localShared ? null : localSelected);
  let sharedDetail = $derived(navigation ? Boolean(page?.id.startsWith("shared:")) : localShared !== null);
  let sharedSelected = $derived(page?.id.startsWith('shared:') ? page.id.slice(7) as SharedOwner : navigation ? null : localShared);
  let opener: HTMLElement | null = null;
  async function select(id: ResolvedNodeId | null) {
    if (navigation && destination) {
      if (id) navigation.open(destination, { id: `component:${id}`, identity: { title: catalogTitle(id), subtitle: catalogPurpose[id] } }, true);
      else navigation.back(destination);
      return;
    }
    if(id) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    localSelected = id;
    await tick();
    if(id) {
      const target=owner.querySelector<HTMLElement>(`[data-catalog-entry="${id}"]`);
      if(target) revealSearchTarget(target,target.closest<HTMLElement>('[data-catalog-scroll]'));
    }
    else opener?.focus({preventScroll:true});
  }
  let owner: HTMLElement;
  async function selectShared(id:SharedOwner|null) {
    if(navigation && destination) {
      if(id) navigation.open(destination,{id:`shared:${id}`,identity:{title:sharedPurpose[id].title,subtitle:sharedPurpose[id].purpose}},!page);
      else navigation.back(destination);
      return;
    }
    const origin=sharedOrigins.at(-1);
    if(id) sharedOrigins.push(id); else sharedOrigins.pop();
    if(id && localShared) sharedHistory=[...sharedHistory,localShared];
    localShared=id??sharedHistory.at(-1)??null;
    if(!id) sharedHistory=sharedHistory.slice(0,-1);
    await tick();
    if(id) owner.querySelector<HTMLElement>('[data-shared-owner-catalog] [data-place-title]')?.focus({preventScroll:true});
    else if(origin) owner.querySelector<HTMLElement>(`[data-destination="${origin}"]`)?.focus({preventScroll:true});
  }
  export async function revealEntry(id: ResolvedNodeId): Promise<HTMLElement | null> {
    await select(id);
    await tick();
    return owner?.querySelector<HTMLElement>(`[data-catalog-entry="${id}"]`) ?? null;
  }
  export async function revealAndFocusEntry(id: ResolvedNodeId) {
    const target = await revealEntry(id);
    if (target) revealSearchTarget(target, target.closest<HTMLElement>("[data-catalog-scroll]"));
  }
</script>

<section bind:this={owner} data-public-catalog-bank class="flex w-full min-w-0 max-w-[52rem] flex-col gap-8" aria-label="Component bank">
  {#if !bodyOnly && !selected && !sharedDetail}
  <PlaceHeader title="Component bank" subtitle="Interactive examples. Changes stay here; no product commands are executed." />
  {/if}
  <div hidden={selected !== null || sharedDetail} class="grid min-w-0 gap-8" data-catalog-index>
    {#each catalogGroups as group (group.id)}
      <StackLayout title={group.title}><GroupedPanel><div data-grouped-rows>
        {#each group.entries as entry (entry.id)}
          <DestinationRow destination={entry.id} label={catalogTitle(entry.id)} icon="catalog" available open={() => void select(entry.id)} />
        {/each}
        {#each sharedIndexOwners(group.id) as id (id)}
          <DestinationRow destination={id} label={sharedPurpose[id].title} icon="catalog" available open={()=>void selectShared(id)} />
        {/each}
      </div></GroupedPanel></StackLayout>
    {/each}
  </div>
  <SharedOwnerCatalog selected={sharedSelected} hosted={Boolean(navigation)} onselect={id=>void selectShared(id)} />
  {#if selected && !navigation}
    <ToolbarLayout content={{kind:"place-navigation",detail:true,onback:()=>void select(null)}} />
    <PlaceHeader title={catalogTitle(selected)} subtitle={catalogPurpose[selected]} />
  {/if}
  {#each entries.filter(entry => entry.family !== "control") as entry (entry.id)}
    <SpecimenGroup id={entry.id} hidden={selected !== entry.id}>
      {#each inventory.filter(item => item.id === entry.id) as specimen (specimen.state)}
        <SpecimenRow id={entry.id} state={specimen.state} coverage={specimen.gap ? "gap" : "rendered"}>
          {#if specimen.node}<PublicCatalogBankSpecimen initial={specimen.node} {oncatalog} />
          {:else if specimen.gap}<SpecimenUnavailable reason={specimen.gap} />{/if}
        </SpecimenRow>
      {/each}
    </SpecimenGroup>
  {/each}
  <ControlBench visibleIds={selected ? [selected] : []} />
  {#if selected && sharedParts(selected).length}
    <StackLayout title="Composition parts"><GroupedPanel><div data-grouped-rows>
      {#each sharedParts(selected) as id}<DestinationRow destination={id} label={sharedPurpose[id].title} icon="catalog" available open={()=>void selectShared(id)} />{/each}
    </div></GroupedPanel></StackLayout>
  {/if}
</section>
