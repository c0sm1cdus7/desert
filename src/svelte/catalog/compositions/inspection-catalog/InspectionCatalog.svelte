<script lang="ts">
  // Closed catalog inventory composition: grouping, specimens and the entry a caller reveals by id. Focus returns and
  // reveals go through the focus scope and the region registry; this composition never touches an element.
  import { onDestroy, tick } from "svelte";
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { ResolvedNodes } from "../../../../interaction/catalog.ts";
  import { catalogGroups, catalogTitle } from "../../../infra/catalog-entries.ts";
  import { Bar, Column, ControlBench, List, PlaceHeading, PublicCatalogBankSpecimen, Row, SharedOwnerCatalog, SpecimenGroup,
    SpecimenRow, SpecimenUnavailable, StackLayout, ViewRegion } from "../../index.ts";
  import type { SharedOwner } from "../../../infra/shared-owners.ts";
  import { sharedPurpose, sharedIndexOwners, sharedParts } from "../../../infra/shared-purpose.ts";
  import { catalogPurpose } from "./purpose.ts";
  import { publicCatalogBankInventory } from "../../../infra/PublicCatalogBank-model.ts";
  import { providePrivateImages } from "../../../infra/private-image-context.ts";
  import { privateImageAccess } from "../../../../web/client/private-images.ts";
  import { destinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { provideRegionRegistry } from "../../../infra/region-registry.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
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
  let { surface, oncatalog, bodyOnly }: CatalogProps<"inspection-catalog"> = $props();
  // Rows register their keys in the host's focus scope (one is opened when there is none); each bank reveals its own
  // entries, so two banks on one page never answer for each other.
  const { focus: focusRegistered } = useFocusScope() ?? provideFocusScope();
  const regions = provideRegionRegistry();
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
  // The entry whose index row opened the shown entry: Back returns focus to that row.
  let opener: ResolvedNodeId | null = null;
  async function select(id: ResolvedNodeId | null) {
    if (navigation && destination) {
      if (id) navigation.open(destination, { id: `component:${id}`, identity: { title: catalogTitle(id), subtitle: catalogPurpose[id] } }, true);
      else navigation.back(destination);
      return;
    }
    const back = opener;
    opener = id;
    localSelected = id;
    await tick();
    if (id) await regions.reveal(`entry:${id}`, true);
    else if (back) focusRegistered(back);
  }
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
    // Back returns focus to the row that opened the owner just closed (an index row or a parts row).
    if(!id && origin) focusRegistered(origin);
  }
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> {
    await select(id);
    await tick();
    return regions.reveal(`entry:${id}`, true);
  }
  const catalogFace = { kind: "face", face: { kind: "icon", icon: "catalog" } } as const;
</script>

<ViewRegion kind="item" id="public-catalog-bank" label={say(m.inspectionCatalog.title)}>
  <Column gap="section" measure="wide">
    {#if !bodyOnly && !selected && !sharedDetail}
      <PlaceHeading context="embedded" title={say(m.inspectionCatalog.title)} subtitle={say(m.inspectionCatalog.subtitle)} />
    {/if}
    <ViewRegion kind="item" id="catalog-index" visible={selected === null && !sharedDetail}>
      <Column gap="section">
        {#each catalogGroups as group (group.id)}
          <StackLayout title={group.title}><List kind="rows" measure="reading">
            {#each group.entries as entry (entry.id)}
              <Row label={catalogTitle(entry.id)} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
                focusKey={entry.id} onopen={() => void select(entry.id)} />
            {/each}
            {#each sharedIndexOwners(group.id) as id (id)}
              <Row label={sharedPurpose[id].title} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
                focusKey={id} onopen={() => void selectShared(id)} />
            {/each}
          </List></StackLayout>
        {/each}
      </Column>
    </ViewRegion>
    <SharedOwnerCatalog selected={sharedSelected} hosted={Boolean(navigation)} onselect={id => void selectShared(id)} />
    {#if selected && !navigation}
      <Bar edge="top" purpose="commands" identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false}
        leading={{ label: say(m.inspectionCatalog.back), icon: "back", state: "ready", intent: { kind: "back" } }}
        oninvoke={() => void select(null)} />
      <PlaceHeading context="embedded" title={catalogTitle(selected)} subtitle={catalogPurpose[selected]} />
    {/if}
    {#each entries.filter(entry => entry.family !== "control") as entry (entry.id)}
      <SpecimenGroup id={entry.id} hidden={selected !== entry.id}>
        {#each inventory.filter(item => item.id === entry.id) as specimen (specimen.state)}
          <SpecimenRow id={entry.id} state={specimen.state}>
            {#if specimen.node}<PublicCatalogBankSpecimen initial={specimen.node} {oncatalog} />
            {:else if specimen.gap}<SpecimenUnavailable reason={specimen.gap} />{/if}
          </SpecimenRow>
        {/each}
      </SpecimenGroup>
    {/each}
    <ControlBench visibleIds={selected ? [selected] : []} />
    {#if selected && sharedParts(selected).length}
      <StackLayout title={say(m.inspectionCatalog.parts)}><List kind="rows" measure="reading">
        {#each sharedParts(selected) as id (id)}
          <Row label={sharedPurpose[id].title} leading={catalogFace} trailing="chevron" interaction="open" available current={false}
            focusKey={id} onopen={() => void selectShared(id)} />
        {/each}
      </List></StackLayout>
    {/if}
  </Column>
</ViewRegion>
