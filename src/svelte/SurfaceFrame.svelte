<script lang="ts">
  import { surfaceFrame, type SurfaceFrame } from "../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import FrameBody from "./FrameBody.svelte";
  import Toolbar from "./pieces/Toolbar.svelte";
  import ScrollEdges from "./pieces/ScrollEdges.svelte";
  import { provideSurfaceHost } from "./pieces/surface-host.svelte.ts";
let { frame, invoke, edit = () => {}, presentation = "standard" }: { frame: SurfaceFrame;
    presentation?: "standard" | "message" | "transient";
    invoke: (intent: SurfaceIntent) => void; edit?: ((name: string, value: string) => void) | undefined } = $props();
  let host = $state<HTMLElement | null>(null);
  let viewport = $state<HTMLDivElement | null>(null);
  provideSurfaceHost(() => host);
  let checked = $derived.by(() => {
    const value = surfaceFrame(frame);
    // A modal message may consolidate dismissal, never suppress task navigation.
    if (presentation === "message" && value.kind !== "message") throw new Error("INVALID_MESSAGE_PRESENTATION");
    return value;
  });
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (checked.content.kind !== "form") return;
    const action = checked.bottom.primary;
    if (action?.state === "ready") invoke(action.intent);
  }
</script>
{#snippet slots()}
  <Toolbar toolbar={{ edge: "top", ...checked.top }} {invoke} {presentation} />
  <div bind:this={viewport} class="surface-content min-h-0 flex-1 overflow-auto" data-surface-slot="content">
    <FrameBody content={checked.content} {invoke} {edit} messageDialog={presentation === "message"} />
  </div>
  {#if checked.bottom.primary || (checked.bottom.secondary && presentation !== "transient")}
    <Toolbar toolbar={{ edge: "bottom", ...checked.bottom }} {invoke} {presentation} submit={checked.content.kind === "form" ? checked.content.submit : undefined} />
  {/if}
  <ScrollEdges {viewport} owner={host} />
{/snippet}
<section bind:this={host} class="flex min-h-0 min-w-0 flex-1 flex-col" data-scroll-owner data-surface-host data-surface-frame={checked.version} data-frame-presentation={presentation} tabindex="-1"
  aria-label={checked.kind === "context" ? "Object context" : checked.kind === "journey" ? "Journey" : undefined}>
  {#if checked.content.kind === "form"}
    <form class="flex min-h-0 flex-1 flex-col" novalidate onsubmit={submit}>{@render slots()}</form>
  {:else}{@render slots()}{/if}
</section>
