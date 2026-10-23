<script lang="ts">
  import Minus from "@lucide/svelte/icons/minus";
  import CircleQuestionMark from "@lucide/svelte/icons/circle-question-mark";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  let { value }: { value: string | number | null | undefined } = $props();
  const state = $derived(factState(value));
</script>

<span data-fact-state={state} class:fact-placeholder={state !== "known"}>
  {#if state !== "known"}
    {@const Icon = state === "empty" ? Minus : CircleQuestionMark}
    <Icon size="1em" aria-hidden="true" />
    {#if state === "empty"}<span class="sr-only">Value state: {presentFact(value)}</span>
    {:else}<span><span class="sr-only">Value state: </span>{presentFact(value)}</span>{/if}
  {:else}{presentFact(value)}{/if}
</span>

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-placeholder :global(svg) { flex-shrink:0; }
</style>
