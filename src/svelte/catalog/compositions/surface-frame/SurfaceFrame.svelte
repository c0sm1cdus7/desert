<script lang="ts">
  import { surfaceFrame, type SurfaceFrame } from "../../../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import ContentFlow from "../content-flow/ContentFlow.svelte";
  import FrameBody from "../../renderer/frame-body/FrameBody.svelte";
  import Toolbar from "../toolbar/Toolbar.svelte";
  import ScrollEdges from "../../foundations/scroll-edges/ScrollEdges.svelte";
  import { provideSurfaceHost } from "../../../infra/surface-host.svelte.ts";
  import { provideToolbarScroll } from "../../../infra/toolbar-scroll.svelte.ts";
  import { isFormControlEvent, type FormControlEvent } from "../../../../interaction/form-control-event.ts";
let { frame, body, invoke, edit = () => {}, presentation = "standard", controlEvent }: { frame: SurfaceFrame;
    body?: ResolvedView | undefined;
    presentation?: "standard" | "message" | "transient";
    invoke: (intent: SurfaceIntent) => void; edit?: ((name: string, value: string) => void) | undefined;
    controlEvent?: ((event: FormControlEvent) => void) | undefined } = $props();
  let host = $state<HTMLElement | null>(null);
  let viewport = $state<HTMLDivElement | null>(null);
  provideSurfaceHost(() => host);
  provideToolbarScroll({ owner: () => host, viewport: () => viewport });
  let checked = $derived.by(() => {
    const value = surfaceFrame(frame);
    // A modal message may consolidate dismissal, never suppress task navigation.
    if (presentation === "message" && value.kind !== "message" && value.kind !== "confirmation") throw new Error("INVALID_MESSAGE_PRESENTATION");
    return value;
  });
  // A commit belongs to the top rail. Only an explicitly multi-step journey
  // owns a bottom navigation rail; confirmations retain their compact choices.
  let steps = $derived(checked.kind === "journey" && checked.navigation === "steps");
  let topCommit = $derived(!steps && (checked.kind === "journey" || checked.kind === "specimen") ? checked.bottom.primary : undefined);
  let top = $derived(topCommit ? {...checked.top, primary:{...topCommit,
    icon:checked.content.kind === "form" || checked.content.kind === "review" ? "confirm" as const : topCommit.icon}} : checked.top);
  let bottom = $derived(steps || checked.kind === "confirmation" || checked.kind === "message");
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (checked.content.kind !== "form") return;
    const action = checked.bottom.primary;
    if (action?.state === "ready") invoke(action.intent);
  }
  function dispatch(event: NodeEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>
{#snippet slots()}
  <Toolbar toolbar={{ edge: "top", ...top }} {invoke} {presentation} submit={checked.content.kind === "form" ? checked.content.submit : undefined} />
  <div bind:this={viewport} class="surface-content min-h-0 flex-1 overflow-auto" data-surface-slot="content">
    {#if body}<ContentFlow resolved={body} onevent={dispatch} host="panel" />
    {:else}<FrameBody content={checked.content} {invoke} {edit} {controlEvent} messageDialog={presentation === "message"} />{/if}
  </div>
  {#if bottom && (checked.bottom.primary || (checked.bottom.secondary && presentation !== "transient"))}
    <Toolbar toolbar={{ edge: "bottom", ...checked.bottom, ...(steps ? {navigation:"steps" as const} : {}) }} {invoke} {presentation} submit={checked.content.kind === "form" ? checked.content.submit : undefined} />
  {/if}
  <ScrollEdges {viewport} owner={host} />
{/snippet}
<section bind:this={host} class="flex min-h-0 min-w-0 flex-1 flex-col" data-scroll-owner data-surface-host data-surface-frame={checked.version} data-frame-presentation={presentation} tabindex="-1"
  aria-label={checked.kind === "context" ? "Object context" : checked.kind === "journey" ? "Journey" : undefined}>
  {#if checked.content.kind === "form"}
    <form class="flex min-h-0 flex-1 flex-col" novalidate onsubmit={submit}>{@render slots()}</form>
  {:else}{@render slots()}{/if}
</section>
