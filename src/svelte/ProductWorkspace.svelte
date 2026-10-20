<script lang="ts">
  import { tick } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import type { HumanState } from "../web/client/state.ts";
  import type { humanProduct } from "../web/client/model.ts";
  import { readPresentation, mutationPresentation } from "../web/client/presentation.ts";
  import { presentFrame } from "../web/client/frame.ts";
  import { toolbarAction } from "../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { surfaceFrame } from "../interaction/surface-frame.ts";
  import { presentCollection } from "../interaction/bank-presenters.ts";
  import SurfaceFrame from "./SurfaceFrame.svelte";
  let { surface, state: current, model, validateInput, connected }: {
    surface: HumanSurface; state: HumanState; model: ReturnType<typeof humanProduct>;
    validateInput: ValidateInput; connected: boolean;
  } = $props();
  let read = $derived(readPresentation(surface));
  let selected = $derived(current.selectedId !== null && (current.view === "detail" ||
    (current.view === "create" && current.creationOrigin === "detail") ||
    ((current.view === "review" || current.view === "recovery") &&
      (current.mutationId !== model.primary.id || current.creationOrigin === "detail"))));
  let frame = $derived(presentFrame(surface, { ...current, view: "detail" }, validateInput));
  let pane = $state<HTMLDivElement>();
  let collection = $state<HTMLElement>();
  let opener: HTMLElement | null = null;
  let journeyOpener: HTMLElement | null = null;
  export function settleFocus() {
    if (current.view === "detail" && pane) {
      if (journeyOpener && pane.contains(journeyOpener) && !journeyOpener.matches(":disabled")) journeyOpener.focus({ preventScroll: true });
      else pane.querySelector<HTMLElement>("[data-surface-frame]")?.focus({ preventScroll: true });
    }
    journeyOpener = null;
  }
  async function select(id: string) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await model.select(id);
    await tick();
    if (current.view === "detail" && current.selectedId === id) pane?.querySelector<HTMLElement>("[data-surface-frame]")?.focus();
  }
  function invoke(intent: SurfaceIntent) {
    if (intent.kind === "back") {
      model.back();
      void tick().then(() => {
        if (opener?.isConnected && opener.getClientRects().length && !opener.matches(":disabled")) opener.focus();
        else collection?.querySelector<HTMLInputElement>("[data-collection-search] input")?.focus();
      });
    } else if (intent.kind === "journey" && current.selectedId) {
      journeyOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      void model.invoke(mutationPresentation(surface, intent.journey), current.selectedId);
    }
  }
</script>
<main class="reading-layout" data-selected={selected}>
  <section bind:this={collection} data-collection-pane aria-label={surface.language.journeys[read.id]}>
    <div class="collection-heading"><h2>{surface.language.journeys[read.id]}</h2>
      {#if current.loaded}<span class="type-support text-muted-foreground">{current.records.length}</span>{/if}</div>
    <div class="collection-heading"><BankRenderer node={{ version: BankVersion, kind: "action", role: "primary",
      action: toolbarAction({ kind: "journey", journey: model.primary.id }, surface.language.journeys[model.primary.id]!, "create",
        !!current.availability.journeys[model.primary.id]?.dependenciesReady && !current.busy && !current.uncertain) }} onevent={model.create} /></div>
    <BankRenderer node={presentCollection(surface, current.records, { loaded: current.loaded,
      selectedId: selected ? current.selectedId : null, disabled: !connected || current.busy || current.uncertain })}
      onevent={event => { if (event.kind === "collection.select") void select(event.id); }} />
  </section>
  {#if selected}
    <div class="reading-pane" bind:this={pane}>
      <SurfaceFrame frame={surfaceFrame({ ...frame, top: { ...frame.top, leading: toolbarAction({ kind: "back" }, "Back", "back", !current.busy) } })} {invoke} />
    </div>
  {/if}
</main>
