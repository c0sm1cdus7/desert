<script lang="ts">
  import { onMount, untrack, tick } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import { humanProduct } from "../web/client/model.ts";
  import { readPresentation } from "../web/client/presentation.ts";
  import SurfaceHost from "./SurfaceHost.svelte";
  import ProductWorkspace from "./ProductWorkspace.svelte";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import KitchenSink from "./catalog/KitchenSink.svelte";
  import { requireCatalog } from "../interaction/catalog.ts";
  import FailureDialog from "./FailureDialog.svelte";
  import ToolbarLayout from "./pieces/ToolbarLayout.svelte";
  import AdaptiveSurfaceLayout from './pieces/AdaptiveSurfaceLayout.svelte';
  import "./theme.css";
let { surface, validateInput }: { surface: HumanSurface, validateInput: ValidateInput } = $props();
  const model = untrack(() => humanProduct(surface, validateInput));
  let viewState = $state.raw(model.snapshot());
  let catalog = $state(false);
  let workspace = $state<ReturnType<typeof ProductWorkspace>>();
  untrack(() => requireCatalog(surface.catalog));
  let read = $derived(readPresentation(surface));
  let reason = $derived(viewState.availability.journeys[read.id]?.blockers[0]?.reason);
  let connected = $derived(viewState.availability.journeys[read.id]?.dependenciesReady === true);
  let status = $derived(connected ? "Local controller ready" : reason === "session-required" ? "Local access required" :
    reason === "incompatible" ? "Contract mismatch" : reason === "unknown" ? "Connecting to local controller…" : "Local controller unavailable · draft kept");
  onMount(() => {
    catalog = new URLSearchParams(location.search).get("catalog") === "1";
    const unsubscribe = model.subscribe(value => { viewState = value; });
    const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
    history.replaceState(null, "", location.pathname + location.search);
    void model.start(invitation ?? undefined);
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (Object.values(viewState.draft).some(Boolean) || viewState.prepared) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => { unsubscribe(); model.stop(); window.removeEventListener("beforeunload", protectDraft); };
  });
</script>

<svelte:head><title>{surface.productId} · DESERT</title></svelte:head>
{#if catalog}
  <KitchenSink {surface} {validateInput} back={() => { catalog = false; history.replaceState(null, "", "/"); }} />
{:else}
<AdaptiveSurfaceLayout>
<div class="product">
  <ToolbarLayout class="topbar"><div class="brand"><span aria-hidden="true" class="brand-mark">{surface.productId.slice(0,1).toUpperCase()}</span><h1>{surface.productId}</h1></div>
    <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
      intent: { kind: "catalog", open: true }, icon: "catalog", label: "Renderer catalog", state: viewState.busy || viewState.uncertain ? "unavailable" : "ready" } }}
      onevent={() => { if (viewState.busy || viewState.uncertain) return; catalog = true; history.replaceState(null, "", "?catalog=1"); }} /></ToolbarLayout>
  <div class="connection">
    <BankRenderer node={{ version: BankVersion, kind: "availability", state: connected ? "ready" : reason === "unknown" ? "unknown" : "unavailable", label: status }} />
    <span class="saved-feedback" role="status">{viewState.notice}</span>
  </div>
  <ProductWorkspace bind:this={workspace} {surface} state={viewState} {model} {validateInput} {connected} />
</div>
<SurfaceHost {surface} state={viewState} {model} {validateInput} {status}
  afterClose={() => { void tick().then(() => workspace?.settleFocus()); }}
  connection={connected ? "ready" : reason === "unknown" ? "unknown" : "unavailable"} />
<FailureDialog code={viewState.error} uncertain={viewState.uncertain} close={model.dismissError} />
</AdaptiveSurfaceLayout>
{/if}
