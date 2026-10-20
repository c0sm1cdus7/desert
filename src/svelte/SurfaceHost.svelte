<script lang="ts">
  import { untrack } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import type { HumanState } from "../web/client/state.ts";
  import type { humanProduct } from "../web/client/model.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { surfaceFrame } from "../interaction/surface-frame.ts";
  import type { BankEvent } from "../interaction/bank-events.ts";
  import { presentFrame } from "../web/client/frame.ts";
  import { mutationPresentation } from "../web/client/presentation.ts";
  import { dispatchSurfaceIntent, type SurfaceIntent } from "../interaction/intent.ts";
let { surface, state: current, model, validateInput, status, connection, afterClose }: {
    surface: HumanSurface; state: HumanState; model: ReturnType<typeof humanProduct>; validateInput: ValidateInput;
    status: string; connection: "ready" | "unknown" | "unavailable";
    afterClose?: () => void;
  } = $props();
  const identity = (value: HumanState) => value.view === "list" || value.view === "detail" ? null : value.view === "create" ||
    (value.mutationId === model.primary.id && (value.view === "review" || value.view === "recovery"))
      ? `journey:${model.primary.id}` : `journey:${value.mutationId}:${value.selectedId}`;
  let mounted = $state.raw<HumanState | null>(null);
  let key = $state<string | null>(null);
  let open = $state(false);
  $effect(() => {
    const next = identity(current);
    untrack(() => {
      if (key === next) { if (key) mounted = current; }
      else if (key) open = false;
      else if (next) { key = next; mounted = current; open = true; }
    });
  });
  function closed() {
    key = identity(current);
    // Presence completion can flush a child's derived frame before its branch
    // is destroyed. Keep that departing snapshot valid through teardown.
    if (key) mounted = current;
    open = !!key;
    if (!key) afterClose?.();
  }
  function invoke(intent: SurfaceIntent) {
    dispatchSurfaceIntent(intent, {
      back: model.back, close: model.close,
      recover: () => { void model.recover(); }, accept: () => { void model.accept(); },
      journey: id => { void model.invoke(mutationPresentation(surface, id), mounted?.view === "detail" ? mounted.selectedId! : undefined); },
    });
  }
  function dispatch(event: BankEvent) {
    if (event.kind === "surface.invoke") invoke(event.intent);
    else if (event.kind === "input.change") model.edit(event.name, event.value);
    else if (event.kind === "transient.close") model.close();
    else if (event.kind === "transient.closed") closed();
  }
</script>
{#if mounted && key}
  {#key key}
    {@const frame = presentFrame(surface, mounted, validateInput)}
    <BankRenderer node={{ version: BankVersion, kind: "transient", label: mounted.view === "detail" ? surface.language.journeys[surface.navigation.entry]! :
      surface.language.journeys[mounted.mutationId && mounted.view !== "create" ? mounted.mutationId : model.primary.id]!,
      open, locked: current.busy || current.uncertain,
      frame: surfaceFrame({ ...frame, top: { ...frame.top, availability: { state: connection, label: status } } }) }} onevent={dispatch} />
  {/key}
{/if}
