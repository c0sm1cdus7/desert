<script lang="ts">
  import { AttentionIndicator, Image } from "../../index.ts";
  // F1-merge: press feedback — the vendor button's pressFeedback attachment (action's family) until its owner is settled.
  import { pressFeedback } from "../../../vendor/components/ui/button/press-feedback.js";
  import { prefetchImage } from "../../../infra/media-source.ts";
  import { useFocusScope } from "../../../infra/focus-scope.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { presentation, label, artwork, alt = "", fit = "fill", prefetch, title, subtitle, attention, current, disabled,
    describedBy, busy, focusKey, onopen, children }: CatalogProps<"card"> = $props();
  const media = $derived(presentation === "item" || presentation === "featured");
  const scope = useFocusScope();
  let button = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    const key = focusKey, target = button;
    if (key === undefined || !target || !scope) return;
    return scope.register(key, () => { target.focus({ preventScroll: true }); return document.activeElement === target; });
  });
  function prepare() { if (prefetch) prefetchImage(prefetch, window.innerWidth * window.devicePixelRatio); }
  function open() {
    if (disabled) return;
    if (focusKey !== undefined) scope?.activated(focusKey);
    onopen?.();
  }
</script>

{#snippet art()}
  {#if typeof artwork === "object" && artwork.kind === "placeholder"}<Image placeholder={artwork.media} />
  {:else if artwork !== undefined}<Image source={artwork} {alt} {fit} />{/if}
{/snippet}

{#if media}
  <div class="card card-media" data-card={presentation}>
    {#if artwork !== undefined}<span class="card-fill">{@render art()}</span>{/if}
    <button bind:this={button} {@attach pressFeedback} type="button" class="card-press material-interior control-feedback type-control" aria-label={label} {disabled}
      onclick={open} onpointerenter={prepare} onfocus={prepare}>
      <span class="card-press-content control-feedback-content" data-button-content>{#if title}<span class="card-overlay type-section">{title}</span>{/if}</span>
    </button>
  </div>
{:else}
  <button bind:this={button} {@attach pressFeedback} type="button" class="card card-button card-{presentation} material-pane control-feedback type-control"
    data-card={presentation} aria-label={label} aria-current={current ? "true" : undefined} aria-describedby={describedBy}
    aria-busy={busy} {disabled} onclick={open} onpointerenter={prepare} onfocus={prepare}>
    <span class="card-content control-feedback-content" data-button-content>
      {#if presentation !== "summary"}<AttentionIndicator required={attention} placement="overlay" />{/if}
      {#if presentation === "tile"}<span class="card-tile-art">{@render art()}</span>
      {:else if presentation === "collection"}
        <span class="card-cover">{#if artwork !== undefined}{@render art()}{:else}<span class="card-cover-empty" aria-hidden="true"></span>{/if}</span>
        <span class="card-copy">{#if title}<strong>{title}</strong>{/if}{#if subtitle}<span class="card-subtitle">{subtitle}</span>{/if}</span>
      {:else}
        {#if title}<span class="card-summary-heading"><strong>{title}</strong>{#if subtitle}<span class="card-subtitle">{subtitle}</span>{/if}</span>{/if}
        {@render children?.()}
      {/if}
    </span>
  </button>
{/if}

<style>
  /* The frames copy the vendor button they replace: an inline flex row, centred, 8px apart, at least 44px tall. */
  .card { border-radius:var(--radius); }
  .card-button, .card-press { align-items:center; gap:.5rem; min-height:2.75rem; margin:0; padding:0; color:var(--foreground);
    text-align:left; white-space:normal; outline:none; }
  .card-button { display:inline-flex; justify-content:center; }
  .card-button:disabled, .card-press:disabled { pointer-events:none; }
  .card-content { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit;
    justify-content:inherit; gap:inherit; }
  /* Item (and featured): the catalog rail card, its title over the artwork's shade. */
  .card-media { position:relative; display:flex; flex-direction:column; flex-shrink:0; min-height:0; overflow:hidden; border:0;
    box-shadow:none; background:var(--card); color:var(--card-foreground); width:calc(var(--catalog-media-height) * 1.4);
    height:var(--catalog-media-height); }
  .card-fill { position:absolute; inset:0; display:block; }
  /* The press target spans the card; it took its square corners from the title it sat in, and the card clips it. */
  .card-press { display:block; position:absolute; inset:0; width:100%; height:100%; justify-content:flex-start; border:0; border-radius:0;
    overflow:hidden; background:transparent; font-weight:400; }
  .card-press:focus-visible { outline:2px solid var(--ring); outline-offset:-3px; }
  .card-press::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(to top,var(--catalog-image-shade),transparent 50%); }
  .card-press-content { position:relative; display:block; width:100%; height:100%; min-width:0; flex-direction:inherit;
    align-items:inherit; justify-content:inherit; gap:inherit; }
  .card-overlay { position:absolute; inset:auto 0 16px; z-index:1; padding:0 12px; pointer-events:none; text-align:center; white-space:normal;
    color:var(--catalog-image-foreground); font-family:var(--font-sans); }
  /* Tile and collection: a pane-material well that opens one media item or collection. */
  .card-tile, .card-collection { position:relative; display:block; width:100%; overflow:hidden; justify-content:flex-start; font-weight:400; }
  .card-tile { aspect-ratio:4/3; }
  .card-tile > .card-content { height:100%; }
  .card-tile[aria-current="true"] { outline:2px solid var(--primary); outline-offset:2px; }
  .card-tile-art { display:block; width:100%; height:100%; overflow:hidden; }
  .card-collection { text-align:start; }
  .card-collection > .card-content { display:block; }
  .card-cover { display:block; aspect-ratio:4/3; overflow:hidden; }
  .card-cover-empty { display:block; width:100%; height:100%; background:var(--muted); }
  .card-copy { display:grid; gap:var(--title-subtitle-gap,4px); padding:var(--well-padding,16px); }
  .card-subtitle { color:var(--muted-foreground); }
  /* Summary: a pane at most 22rem wide, its readings stacked 1rem apart. */
  .card-summary { align-items:stretch; width:min(100%,22rem); max-width:100%; min-width:0; min-height:13rem;
    padding:var(--space-4,1rem); border-radius:var(--radius-group); text-align:start; }
  .card-summary > .card-content { flex-direction:column; align-items:stretch; gap:var(--space-4,1rem); }
  /* Its title over its description, 4px apart, wrapping anywhere; the description reads at the regular weight. */
  .card-summary-heading { display:flex; flex-direction:column; gap:var(--title-subtitle-gap,4px); min-width:0; overflow-wrap:anywhere; }
  .card-summary-heading > .card-subtitle { font-weight:400; }
</style>
