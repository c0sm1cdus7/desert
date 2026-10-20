<script lang="ts">
  import { tick } from "svelte";
  import * as Empty from "@desert/svelte/vendor/components/ui/empty/index.js";
  import type { PublicCatalogSurface } from "../../public-catalog/index.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogGroups, matchingEntries } from "../catalog/navigation.ts";
  import CatalogNavigation from "../catalog/CatalogNavigation.svelte";
  import CatalogGroupHeader from "../catalog/CatalogGroupHeader.svelte";
  import CatalogFoundations from "../catalog/CatalogFoundations.svelte";
  import ControlBench from "../catalog/ControlBench.svelte";
  import SpecimenGroup from "../catalog/SpecimenGroup.svelte";
  import SpecimenRow from "../catalog/SpecimenRow.svelte";
  import SpecimenUnavailable from "../catalog/SpecimenUnavailable.svelte";
  import PublicCatalogBankSpecimen from "./PublicCatalogBankSpecimen.svelte";
  import { publicCatalogBankInventory } from "./PublicCatalogBank-model.ts";
  import PlaceHeader from "../pieces/PlaceHeader.svelte";
  let { surface, oncatalog, bodyOnly = false, query = $bindable("") }: {
    surface: PublicCatalogSurface; oncatalog: (event: BankEvent) => void; bodyOnly?: boolean; query?: string;
  } = $props();
  let inventory = $derived(publicCatalogBankInventory(surface));
  let entries = $derived(matchingEntries(query));
  let visibleIds = $derived(entries.map(entry => entry.id));
  export async function revealEntry(id: PrimitiveId): Promise<HTMLElement | null> {
    if (!visibleIds.includes(id)) query = "";
    await tick();
    return document.querySelector<HTMLElement>(`[data-public-catalog-bank] [data-catalog-entry="${id}"]`);
  }
</script>

<section data-public-catalog-bank class="flex w-full min-w-0 max-w-[52rem] flex-col gap-8" aria-label="Component bank">
  {#if !bodyOnly}
  <PlaceHeader title="Component bank" subtitle="Interactive examples. Changes stay here; no product commands are executed." />
  {/if}
  <CatalogNavigation bind:query {entries} />
  {#each catalogGroups as group (group.id)}
    <section class="flex min-w-0 flex-col gap-8" aria-label={group.title} hidden={!group.entries.some(entry => visibleIds.includes(entry.id))}>
    <CatalogGroupHeader family={group.family} />
    {#if group.id === "foundations"}<CatalogFoundations />{/if}
    {#each group.entries.filter(entry => entry.family !== "control") as entry (entry.id)}
    <SpecimenGroup id={entry.id} hidden={!visibleIds.includes(entry.id)}>
      {#each inventory.filter(item => item.id === entry.id) as specimen (specimen.state)}
        <SpecimenRow id={entry.id} state={specimen.state} coverage={specimen.gap ? "gap" : "rendered"}>
          {#if specimen.node}<PublicCatalogBankSpecimen initial={specimen.node} {oncatalog} />
          {:else if specimen.gap}<SpecimenUnavailable reason={specimen.gap} />{/if}
        </SpecimenRow>
      {/each}
    </SpecimenGroup>
    {/each}
    <ControlBench entryIds={group.entries.filter(entry => entry.family === "control").map(entry => entry.id)} {visibleIds} />
    </section>
  {/each}
  {#if !entries.length}<Empty.Root><Empty.Header><Empty.Title>No matching components</Empty.Title>
    <Empty.Description>Try a component name, identifier or state.</Empty.Description></Empty.Header></Empty.Root>{/if}
</section>
