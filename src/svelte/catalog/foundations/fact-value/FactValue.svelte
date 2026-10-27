<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Icon } from "../../index.ts";
  import { factState, presentFact } from "../../../../interaction/fact-presentation.ts";
  import { nameParts } from "../../../../interaction/name-parts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { value, presentation = "inline" }: CatalogProps<"fact-value"> = $props();
  const state = $derived(factState(value));
  // A known path breaks only after a separator or before its file's extension, never inside a word or at a hyphen (a
  // source path in a narrow row): each piece holds together, a break opportunity between them (nameParts). On a narrow
  // page a name also breaks between its words, and a piece longer than the line wraps at its own hyphens. Any other value
  // is one piece and wraps as text does. CSS alone decides it (typography's narrow-page), and the text is never split
  // further: its words are drawn on a narrow page by generated content, each word boundary a zero-width space there, while
  // the text itself stays for reading, copying and assistive technology (screen-reader-only; the drawn copy has an empty
  // alternative). Elsewhere the text keeps its pieces and glyphs exactly, and no break opportunity is added.
  const shown = $derived(presentFact(value));
  const strict = $derived(nameParts(shown, false));
  const loose = $derived(nameParts(shown, true));
  const words = $derived(state === "known" && loose.length > strict.length ? loose.join("\u200b") : undefined);
</script>

<!-- A name as its pieces: each holds together, a break opportunity between them. -->
{#snippet pieces(parts: readonly string[])}{#if parts.length > 1}{#each parts as part, index (index)}{#if index}<wbr />{/if}<span
  class="whitespace-nowrap narrow-page:whitespace-normal">{part}</span>{/each}{:else}{shown}{/if}{/snippet}

{#snippet reading()}
  <span data-fact-state={state} data-fact-words={words} class:fact-placeholder={state !== "known"}
    class={state !== "known" ? "[&_svg]:shrink-0" : words ? "narrow-page:after:content-[attr(data-fact-words)_/_'']" : undefined}>
    {#if state !== "known"}
      <Icon name={state === "empty" ? "minus" : "circle-question-mark"} size="em" decorative />
      {#if state === "empty"}<span class="sr-only">{say(m.factValue.state)} {presentFact(value)}</span>
      {:else}<span><span class="sr-only">{say(m.factValue.state)} </span>{presentFact(value)}</span>{/if}
    {:else if words}<span class="narrow-page:sr-only">{@render pieces(strict)}</span>
    {:else}{@render pieces(strict)}{/if}
  </span>
{/snippet}

<!-- A paragraph is the reading copy of a long text fact (ReadingContent's), at the body role. -->
{#if presentation === "paragraph"}<p class="fact-paragraph type-body wrap-words" data-fact-presentation="paragraph">{@render reading()}</p>
{:else}{@render reading()}{/if}

<style>
  .fact-placeholder { display:inline-flex; max-width:100%; align-items:center; gap:.375em; color:var(--muted-foreground); white-space:normal; }
  .fact-paragraph { padding-inline:var(--row-inset); max-width:68ch; white-space:pre-wrap; }
</style>
