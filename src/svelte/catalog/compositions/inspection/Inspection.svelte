<script lang="ts">
  // Local inspection navigation retains diagnostic state; it never invokes product commands. Back returns focus through
  // the focus scope to the piece last activated before the detail opened (the card that opened it).
  import { tick } from "svelte";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { CatalogDetail, InspectionCatalog, NodeRenderer, Toolbar, ViewRegion } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { inspectionCatalog } from "./inspection-fixture.ts";
  import { destinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";

  let { catalog = inspectionCatalog }: CatalogProps<"inspection"> = $props();
  const scope = useFocusScope() ?? provideFocusScope();
  let bank = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean> }>();
  const navigation = destinationNavigation(), destination = navigation?.destination();
  let localSelected = $state<string | null>(null);
  let page = $derived(destination ? navigation?.current(destination) : undefined);
  let selected = $derived(page?.id.startsWith("record:") ? page.id.slice(7) : navigation ? null : localSelected);
  let detail = $derived(catalog.details.find(item => item.record === selected));
  let opener: string | null = null;
  async function back() {
    if(navigation && destination) { navigation.back(destination); return; }
    localSelected = null;
    await tick();
    if (opener) scope.focus(opener);
  }
  function interact(event: NodeEvent) {
    if (event.kind === "catalog.open") {
      if (!catalog.details.some(item => item.record === event.record)) throw new Error("UNKNOWN_INSPECTION_RECORD");
      if(navigation && destination) {
        const detail = catalog.details.find(item => item.record === event.record)!;
        navigation.open(destination, {id:`record:${event.record}`, identity:{title:detail.title,subtitle:say(m.inspection.example),
          media: detail.gallery ? {kind:"gallery",images:detail.gallery} : {kind:"image",...detail.image}}});
        return;
      }
      opener = scope.lastActivated();
      localSelected = event.record;
    } else if (event.kind === "catalog.back") void back();
  }
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> {
    localSelected = null;
    await tick();
    return bank?.revealEntry(id) ?? false;
  }
</script>

<ViewRegion kind="retained" id="inspection" active={!detail} visible={!detail}>
  <InspectionCatalog bind:this={bank} surface={catalog} oncatalog={interact} bodyOnly />
</ViewRegion>
{#if detail}
  {#if !navigation}<Toolbar toolbar={{ edge: "top", title: detail.title, subtitle: say(m.inspection.example), leading: {
    intent: { kind: "back" }, icon: "back", label: say(m.inspection.back), state: "ready",
  } }} invoke={() => void back()} />{/if}
  {#if navigation}<CatalogDetail node={detail} onevent={interact} bodyOnly />
  {:else}<NodeRenderer node={detail} onevent={interact} />{/if}
{/if}
