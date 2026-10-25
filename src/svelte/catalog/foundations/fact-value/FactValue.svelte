<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Icon } from "../../index.ts";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { value, presentation = "inline" }: CatalogProps<"fact-value"> = $props();
  const state = $derived(factState(value));
</script>

{#snippet reading()}
  <span data-fact-state={state} class:fact-placeholder={state !== "known"} class={state !== "known" ? "[&_svg]:shrink-0" : undefined}>
    {#if state !== "known"}
      <Icon name={state === "empty" ? "minus" : "circle-question-mark"} size="em" decorative />
      {#if state === "empty"}<span class="sr-only">{say(m.factValue.state)} {presentFact(value)}</span>
      {:else}<span><span class="sr-only">{say(m.factValue.state)} </span>{presentFact(value)}</span>{/if}
    {:else}{presentFact(value)}{/if}
  </span>
{/snippet}

<!-- A paragraph is the reading copy of a long text fact (ReadingContent's), at the body role. -->
{#if presentation === "paragraph"}<p class="fact-paragraph type-body" data-fact-presentation="paragraph">{@render reading()}</p>
{:else}{@render reading()}{/if}

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-paragraph { padding-inline:1rem; max-width:68ch; white-space:pre-wrap; overflow-wrap:anywhere; }
</style>
