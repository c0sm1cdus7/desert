<script lang="ts">
  import { AttentionIndicator, Face, Icon, Image } from "../../index.ts";
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  import { useFocusScope } from "../../../infra/focus-scope.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, description, metadata = [], leading, trailing, interaction, available, reason, current, focusKey, attention = false, onopen }: CatalogProps<"row"> = $props();
  const id = $props.id(), reasonId = `${id}-reason`;
  const scope = useFocusScope();
  let button = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    const key = focusKey, target = button;
    if (key === undefined || !target || !scope) return;
    return scope.register(key, () => { target.focus({ preventScroll: true }); return document.activeElement === target; });
  });
  function open() {
    if (!available) return;
    if (focusKey !== undefined) scope?.activated(focusKey);
    onopen?.();
  }
</script>

{#snippet content()}
  {#if leading?.kind === "face"}<Face face={leading.face} />
  {:else if leading?.kind === "attention"}<AttentionIndicator required={leading.required} />
  {:else if leading?.kind === "image"}<span class="row-artwork"><Image frame="host" source={leading.source} alt={leading.alt} fit={leading.fit} /></span>
  {:else if leading?.kind === "artwork"}<span class="row-artwork"><Image frame="host" placeholder={leading.media} /></span>{/if}
  <span class="row-copy">
    <span class="row-label">{label}</span>
    {#if description}<span class="row-description">{description}</span>{/if}
    {#if metadata.length}<span class="row-metadata">{#each metadata as item, index (index)}<span>{item}</span>{/each}</span>{/if}
  </span>
  {#if trailing === "chevron"}<Icon name="chevron-right" placement="inline-end" chevron decorative />{/if}
{/snippet}

<!-- A row sizes every glyph it holds (a face's, the chevron) to one rem, as the vendor row button did. The class is one
     array, never a class: directive beside a static class: Svelte 5.57 then escapes "&" twice and [&_svg] stops matching. -->
{#if interaction === "open"}
  <button bind:this={button} {@attach pressFeedback} type="button" class={["row material-interior control-feedback [&_svg]:size-4 [&_svg]:shrink-0", attention && "row-attended"]} data-row="open" data-focus-key={focusKey}
    data-row-leading={leading?.kind} disabled={!available} aria-current={current ? "true" : undefined}
    aria-describedby={!available && reason ? reasonId : undefined} title={!available ? reason : undefined} onclick={open}>
    <!-- The attention dot sits over the row's corner, as it sat over the media list item. -->
    {#if attention}<AttentionIndicator required placement="overlay" />{/if}
    <span class="row-content control-feedback-content disabled-content" data-button-content>{@render content()}</span>
  </button>
  {#if !available && reason}<span id={reasonId} class="sr-only">{reason}</span>{/if}
{:else}
  <div class="row [&_svg]:size-4 [&_svg]:shrink-0" data-row="static" data-row-leading={leading?.kind} data-focus-key={focusKey}><span class="row-content">{@render content()}</span></div>
{/if}

<style>
  /* The grouped row's geometry: a full-width, at least 44px interior, one hairline between rows of the same list, its ends
     at the control radius (concentric inside the list's border, law 9d). It sets
     no box-shadow: this unlayered rule would win over control-feedback's hover and press tints, which are box-shadows. */
  .row { display:flex; align-items:center; justify-content:flex-start; gap:.5rem; width:100%; min-width:0; min-height:2.75rem;
    margin:0; padding:.75rem 1rem; border:0; border-radius:0; background:transparent; color:var(--foreground);
    font:inherit; font-size:var(--text-control); line-height:var(--text-control--line-height); font-weight:400;
    text-align:left; white-space:normal; outline:none; }
  .row:not(:first-child) { border-top:1px solid var(--separator); }
  .row:first-child { border-start-start-radius:var(--radius-control); border-start-end-radius:var(--radius-control); }
  .row:last-child { border-end-start-radius:var(--radius-control); border-end-end-radius:var(--radius-control); }
  .row:disabled { pointer-events:none; }
  .row-attended { position:relative; }
  .row:focus-visible { outline:2px solid var(--ring); outline-offset:-3px; box-shadow:none; }
  /* The content keeps the row's justification itself, as the vendor button's global content rule gave it. */
  .row-content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:center; justify-content:inherit; gap:inherit; }
  /* An attention dot or an image keeps the record row's and media item's wider gap. */
  .row[data-row-leading="attention"], .row[data-row-leading="image"], .row[data-row-leading="artwork"] { gap:1rem; }
  .row-artwork { display:block; flex:none; width:80px; height:60px; overflow:hidden; border-radius:var(--radius-control); }
  .row-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:.25rem; text-align:start; }
  .row-label { font-size:var(--text-control); line-height:var(--text-control--line-height); font-weight:var(--text-control--font-weight); overflow-wrap:anywhere; }
  .row-description { color:var(--muted-foreground); overflow-wrap:anywhere; text-wrap:balance; }
  .row-metadata { display:flex; flex-wrap:wrap; gap:.375rem 1rem; color:var(--muted-foreground); font-size:var(--text-body); }
</style>
