<script lang="ts">
  // Local inspection navigation retains diagnostic state; it never invokes product commands.
  import { tick } from "svelte";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../../../interaction/catalog.ts";
  import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
  import { InspectionCatalog } from "../../../adapter-catalog.ts";
  import RetainedPlace from "../retained-place/RetainedPlace.svelte";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import CatalogDetail from "../catalog-detail/CatalogDetail.svelte";
  import Toolbar from "../toolbar/Toolbar.svelte";
  import { inspectionCatalog } from "./inspection-fixture.ts";
  import { destinationNavigation } from "../../../infra/destination-navigation.svelte.ts";

  let { catalog = inspectionCatalog }: {
    catalog?: PublicBankInput;
  } = $props();
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> }>();
  const navigation = destinationNavigation(), destination = navigation?.destination();
  let localSelected = $state<string | null>(null);
  let page = $derived(destination ? navigation?.current(destination) : undefined);
  let selected = $derived(page?.id.startsWith("record:") ? page.id.slice(7) : navigation ? null : localSelected);
  let detail = $derived(catalog.details.find(item => item.record === selected));
  let opener: HTMLElement | null = null;
  async function back() {
    if(navigation && destination) { navigation.back(destination); return; }
    localSelected = null;
    await tick();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function interact(event: BankEvent) {
    if (event.kind === "catalog.open") {
      if (!catalog.details.some(item => item.record === event.record)) throw new Error("UNKNOWN_INSPECTION_RECORD");
      if(navigation && destination) {
        const detail = catalog.details.find(item => item.record === event.record)!;
        navigation.open(destination, {id:`record:${event.record}`, identity:{title:detail.title,subtitle:"Local renderer example",
          media: detail.gallery ? {kind:"gallery",images:detail.gallery} : {kind:"image",...detail.image}}});
        return;
      }
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      localSelected = event.record;
    } else if (event.kind === "catalog.back") void back();
  }
  export async function revealEntry(id: PrimitiveId): Promise<HTMLElement | null> {
    localSelected = null;
    await tick();
    return bank?.revealEntry(id) ?? null;
  }
</script>

<RetainedPlace active={!detail}>
  <InspectionCatalog bind:this={bank} surface={catalog} oncatalog={interact} bodyOnly />
</RetainedPlace>
{#if detail}
  {#if !navigation}<Toolbar toolbar={{ edge: "top", title: detail.title, subtitle: "Local renderer example", leading: {
    intent: { kind: "back" }, icon: "back", label: "Back to visual catalog", state: "ready",
  } }} invoke={() => void back()} />{/if}
  {#if navigation}<CatalogDetail node={detail} onevent={interact} bodyOnly />
  {:else}<BankRenderer node={detail} onevent={interact} />{/if}
{/if}
