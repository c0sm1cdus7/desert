<script lang="ts">
  import { Icon } from "../../index.ts";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { value }: CatalogProps<"fact-value"> = $props();
  const state = $derived(factState(value));
</script>

<span data-fact-state={state} class:fact-placeholder={state !== "known"}>
  {#if state !== "known"}
    <Icon name={state === "empty" ? "minus" : "circle-question-mark"} size="em" decorative />
    {#if state === "empty"}<span class="sr-only">Value state: {presentFact(value)}</span>
    {:else}<span><span class="sr-only">Value state: </span>{presentFact(value)}</span>{/if}
  {:else}{presentFact(value)}{/if}
</span>

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-placeholder :global(svg) { flex-shrink:0; }
</style>
