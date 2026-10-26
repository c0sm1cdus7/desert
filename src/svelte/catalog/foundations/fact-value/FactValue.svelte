<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Icon } from "../../index.ts";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  import { nameParts } from "../../../../interaction/name-parts.ts";
  import { narrowPage } from "../../mechanisms/typography/narrow-page.svelte.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { value, presentation = "inline" }: CatalogProps<"fact-value"> = $props();
  const state = $derived(factState(value));
  // A known path breaks only after a separator or before its file's extension, never inside a word or at a hyphen (a
  // source path in a narrow row): each piece holds together, a break opportunity between them (nameParts). On a narrow
  // page (typography's narrow-page) a name also breaks between its words, and a piece longer than the line wraps at its
  // own hyphens. Any other value is one piece and wraps as text does.
  const narrow = narrowPage();
  const shown = $derived(presentFact(value));
  const segments = $derived(nameParts(shown, narrow.current));
</script>

{#snippet reading()}
  <span data-fact-state={state} class:fact-placeholder={state !== "known"} class={state !== "known" ? "[&_svg]:shrink-0" : undefined}>
    {#if state !== "known"}
      <Icon name={state === "empty" ? "minus" : "circle-question-mark"} size="em" decorative />
      {#if state === "empty"}<span class="sr-only">{say(m.factValue.state)} {presentFact(value)}</span>
      {:else}<span><span class="sr-only">{say(m.factValue.state)} </span>{presentFact(value)}</span>{/if}
    {:else if segments.length > 1}{#each segments as segment, index (index)}{#if index}<wbr />{/if}<span class="whitespace-nowrap narrow-page:whitespace-normal">{segment}</span>{/each}
    {:else}{shown}{/if}
  </span>
{/snippet}

<!-- A paragraph is the reading copy of a long text fact (ReadingContent's), at the body role. -->
{#if presentation === "paragraph"}<p class="fact-paragraph type-body wrap-words" data-fact-presentation="paragraph">{@render reading()}</p>
{:else}{@render reading()}{/if}

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-paragraph { padding-inline:var(--row-inset); max-width:68ch; white-space:pre-wrap; }
</style>
