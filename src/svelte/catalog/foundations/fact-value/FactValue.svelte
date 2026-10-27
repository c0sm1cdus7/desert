<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Icon } from "../../index.ts";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  import { nameGroups } from "../../../../interaction/name-parts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { value, presentation = "inline" }: CatalogProps<"fact-value"> = $props();
  const state = $derived(factState(value));
  // A known path breaks only after a separator or before its file's extension, never inside a word or at a hyphen (a
  // source path in a narrow row): each piece holds together, a break opportunity between them (nameParts). On a narrow
  // page (typography's narrow-page, decided by CSS alone) a name also breaks between its words, and a piece longer than
  // the line wraps at its own hyphens. The markup is the same on every page and in every state: the real text, visible,
  // with a <wbr> at each join and nothing duplicated or generated; a path's piece is no-wrap and draws no <wbr> of its
  // own until the page is narrow (Chromium breaks at a <wbr> even under no-wrap).
  const shown = $derived(presentFact(value));
  const groups = $derived(nameGroups(shown));
</script>

<!-- A name as its words: a break opportunity at every join; a path's pieces hold together until the page is narrow. -->
{#snippet words(parts: readonly string[])}{#each parts as word, index (index)}{#if index}<wbr />{/if}{word}{/each}{/snippet}
{#snippet pieces()}{#if groups.length > 1}{#each groups as group, index (index)}{#if index}<wbr />{/if}<span
  class="whitespace-nowrap narrow-page:whitespace-normal [&>wbr]:hidden narrow-page:[&>wbr]:inline">{@render words(group)}</span>{/each}{:else}{@render words(groups[0]!)}{/if}{/snippet}

{#snippet reading()}
  <span data-fact-state={state} class:fact-placeholder={state !== "known"} class={state !== "known" ? "[&_svg]:shrink-0" : undefined}>
    {#if state !== "known"}
      <Icon name={state === "empty" ? "minus" : "circle-question-mark"} size="em" decorative />
      {#if state === "empty"}<span class="sr-only">{say(m.factValue.state)} {presentFact(value)}</span>
      {:else}<span><span class="sr-only">{say(m.factValue.state)} </span>{presentFact(value)}</span>{/if}
    {:else}{@render pieces()}{/if}
  </span>
{/snippet}

<!-- A paragraph is the reading copy of a long text fact (ReadingContent's), at the body role. -->
{#if presentation === "paragraph"}<p class="fact-paragraph type-body wrap-words" data-fact-presentation="paragraph">{@render reading()}</p>
{:else}{@render reading()}{/if}

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-paragraph { padding-inline:var(--row-inset); max-width:68ch; white-space:pre-wrap; }
</style>
