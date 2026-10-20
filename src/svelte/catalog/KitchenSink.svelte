<script lang="ts">
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import Specimen from "./Specimen.svelte";
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import ControlBench from "./ControlBench.svelte";
  import * as Empty from "@desert/svelte/vendor/components/ui/empty/index.js";
  import CatalogNavigation from "./CatalogNavigation.svelte";
  import CatalogGroupHeader from "./CatalogGroupHeader.svelte";
  import CatalogFoundations from "./CatalogFoundations.svelte";
  import SpecimenGroup from "./SpecimenGroup.svelte";
  import SpecimenRow from "./SpecimenRow.svelte";
  import SpecimenUnavailable from "./SpecimenUnavailable.svelte";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import { catalogGroups, matchingEntries } from "./navigation.ts";
  let { surface, validateInput, back }: { surface: HumanSurface; validateInput: ValidateInput; back: () => void } = $props();
  let query = $state("");
  let entries = $derived(matchingEntries(query));
  let visibleIds = $derived(entries.map(entry => entry.id));
</script>
<main class="catalog mx-auto flex w-full min-w-0 max-w-[52rem] flex-col gap-8">
  <ToolbarLayout class="catalog-header"><div class="flex flex-col gap-2"><h1 class="type-page">DESERT renderer catalog</h1>
    <p class="type-caption text-muted-foreground">{InteractionCatalog.id} · {InteractionCatalog.version} · shadcn-svelte</p></div>
    <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
      intent: { kind: "catalog", open: false }, icon: "back", label: "Back to product", state: "ready" } }} onevent={back} /></ToolbarLayout>
  <p class="type-caption text-muted-foreground max-w-prose">Isolated renderer examples. Local changes do not execute product commands; return to the product to use its controller.</p>
  <CatalogNavigation bind:query {entries} />
  {#if entries.length === 0}
    <Empty.Root>
      <Empty.Header><Empty.Title>No matching components</Empty.Title>
        <Empty.Description>Try a component name, typed identifier or declared state.</Empty.Description></Empty.Header>
    </Empty.Root>
  {/if}
  {#each catalogGroups as group (group.id)}
    <section class="flex min-w-0 flex-col gap-6" aria-label={group.title} hidden={!entries.some(entry => entry.inspection.group === group.id)}>
      <CatalogGroupHeader family={group.family} />
      {#if group.id === "foundations"}<CatalogFoundations />{/if}
      {#each group.entries.filter(entry => entry.family !== "control") as entry (entry.id)}
        <SpecimenGroup id={entry.id} hidden={!visibleIds.includes(entry.id)}>
          {#each entry.states as state, index (state)}
            <SpecimenRow id={entry.id} {state} divided={index > 0} coverage={entry.id.startsWith("catalog.") ? "gap" : "rendered"}>
              {#if entry.id.startsWith("catalog.")}
                <SpecimenUnavailable reason="This media fixture requires a public catalog product. Open the Landmarks component bank to exercise its installed content." />
              {:else}<Specimen id={entry.id} {state} {surface} {validateInput} />{/if}
            </SpecimenRow>
          {/each}
        </SpecimenGroup>
      {/each}
      <ControlBench entryIds={group.entries.filter(entry => entry.family === "control").map(entry => entry.id)} {visibleIds} />
    </section>
  {/each}
  <section class="flex flex-col gap-2"><h2 class="type-section">Not installed in product execution</h2>
    <p class="type-support text-muted-foreground">Dates, money, selections, attachments, charts, tables and nested-object editing need their own
      typed interaction contracts and tests before a product can use them. Visual availability in the bench is not product execution support.</p>
  </section>
</main>
