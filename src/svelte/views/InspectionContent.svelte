<script lang="ts">
  import { tick } from "svelte";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import type { PublicBankInput } from "../explorer/PublicCatalogBank-model.ts";
  import PublicCatalogBank from "../explorer/PublicCatalogBank.svelte";
  import RetainedPlace from "../explorer/RetainedPlace.svelte";
  import BankRenderer from "../BankRenderer.svelte";
  import Toolbar from "../pieces/Toolbar.svelte";
  import { inspectionCatalog } from "../catalog/inspection-fixture.ts";

  let { catalog = inspectionCatalog, query = $bindable("") }: {
    catalog?: PublicBankInput; query?: string;
  } = $props();
  let bank: PublicCatalogBank | undefined = $state();
  let selected = $state<string | null>(null);
  let detail = $derived(catalog.details.find(item => item.record === selected));
  let opener: HTMLElement | null = null;
  async function back() {
    selected = null;
    await tick();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function interact(event: BankEvent) {
    if (event.kind === "catalog.open") {
      if (!catalog.details.some(item => item.record === event.record)) throw new Error("UNKNOWN_INSPECTION_RECORD");
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      selected = event.record;
    } else if (event.kind === "catalog.back") void back();
    else if (event.kind === "catalog.search") { query = event.query; selected = null; }
  }
  export async function revealEntry(id: PrimitiveId): Promise<HTMLElement | null> {
    selected = null;
    await tick();
    return bank?.revealEntry(id) ?? null;
  }
</script>

<RetainedPlace active={!detail}>
  <PublicCatalogBank bind:this={bank} surface={catalog} oncatalog={interact} bodyOnly bind:query />
</RetainedPlace>
{#if detail}
  <Toolbar toolbar={{ edge: "top", title: detail.title, subtitle: "Local renderer example", leading: {
    intent: { kind: "back" }, icon: "back", label: "Back to visual catalog", state: "ready",
  } }} invoke={() => void back()} />
  <BankRenderer node={detail} onevent={interact} />
{/if}
