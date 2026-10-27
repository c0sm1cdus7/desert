<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Image, MediaViewer } from '../../index.ts';
  import { mediaGestures } from '../../mechanisms/media-gestures/media-gestures.ts';
  import { prefetchImage, imageIdentity } from '../../../infra/media-source.ts';
  import type { CatalogProps } from '../../types.d.ts';
  let { photos, title, presentation, fit, aspect }: CatalogProps<'gallery'> = $props();
  let index = $state(0), open = $state(false), failed = $state(false);
  let host: HTMLDivElement | null = null;
  const selected = $derived(photos[index] ?? photos[0]);
  function select(next: number) { index = Math.max(0, Math.min(photos.length - 1, next)); failed = false; }
  function drag(button: HTMLButtonElement) {
    return mediaGestures(button, { image: () => host?.querySelector('img') ?? null, page: direction => select(index + direction),
      canPage: () => photos.length > 1 });
  }
  // The neighbours of the shown photo are warmed at the gallery's rendition edge.
  $effect(() => {
    const current = index, frame = host;
    if (!frame) return;
    for (const neighbor of [photos[current - 1], photos[current + 1]]) if (neighbor)
      prefetchImage(neighbor.source, Math.max(frame.clientWidth || 640, frame.clientHeight) * window.devicePixelRatio);
  });
  function key(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault(); select(index + (event.key === 'ArrowRight' ? 1 : -1));
  }
</script>

<!-- The legacy marks (photo collection, opener, dots, header collection) keep the hosts that have not migrated
     (place-heading.css) placing the gallery as they placed PhotoCollection. -->
<div bind:this={host} class="gallery gallery-{presentation} gallery-aspect-{aspect}" class:gallery-failed={failed} data-photo-collection
  data-header-collection={presentation === 'header' || undefined}>
  {#if selected}<Image frame="host" source={selected.source} alt={selected.alt} edge={presentation === 'header' ? 1280 : 640} {fit} retry
    onready={() => failed = false} onunavailable={() => failed = true} />{/if}
  <button type="button" class="gallery-open" use:drag data-media-open aria-label={say(m.gallery.open)} onclick={() => open = true} onkeydown={key}></button>
  {#if photos.length > 1}
    <div class="gallery-dots" data-media-dots aria-label={say(m.gallery.choose)}>
      {#each photos as photo, i (`${i}:${imageIdentity(photo.source)}`)}
        <button type="button" class="gallery-dot" aria-label={say(m.gallery.photo, { number: String(i + 1), alt: photo.alt })} aria-current={i === index ? 'true' : undefined}
          onclick={() => select(i)}></button>
      {/each}
    </div>
  {/if}
</div>
{#if open}
  <MediaViewer items={photos.map(photo => ({ kind: 'image' as const, ...photo }))} {title} {index} {open}
    onindex={value => index = value} onopenchange={value => open = value} />
{/if}

<style>
  /* The frame and its controls sit in the components layer, so a host that places the gallery (a place heading)
     still outranks them. */
  @layer components {
    .gallery { position:relative; width:100%; height:100%; overflow:hidden; }
    .gallery-open { position:absolute; inset:0; border:0; padding:0; background:transparent; cursor:zoom-in; touch-action:pan-y; outline:none; box-shadow:none; }
    .gallery-open:focus-visible::after { content:attr(aria-label); position:absolute; right:16px; bottom:56px; padding:8px 12px; border-radius:var(--radius-chip);
      background:var(--background); color:var(--foreground); font-size:var(--text-support,14px); }
    /* A photo that cannot load keeps its retry reachable: the opener stops covering it. */
    .gallery-failed .gallery-open { pointer-events:none; }
    .gallery-dots { position:absolute; bottom:8px; left:50%; z-index:3; display:flex; transform:translateX(-50%); }
    .gallery-dot { display:grid; place-items:center; width:24px; height:44px; padding:0; border:0; background:none; color:var(--catalog-image-foreground); }
    .gallery-dot::after { content:''; width:6px; height:6px; border-radius:var(--radius-mark); background:currentColor; opacity:.45; box-shadow:0 0 3px var(--catalog-image-shade); }
    .gallery-dot[aria-current="true"]::after { opacity:1; width:8px; height:8px; }
  }
  /* Where the gallery sits fixes its frame: inline in a page, as a detail's photograph, or heading a place. */
  .gallery-inline { border-radius:var(--radius-control); }
  .gallery-inline.gallery-aspect-fill { height:clamp(14rem,50vh,36rem); }
  .gallery-aspect-square, .gallery-aspect-landscape, .gallery-aspect-portrait { height:auto; }
  .gallery-aspect-square { aspect-ratio:1; }
  .gallery-aspect-landscape { aspect-ratio:16/9; }
  .gallery-aspect-portrait { aspect-ratio:3/4; }
  .gallery-detail { height:var(--catalog-hero-height); border-radius:var(--radius-control); }
  /* Heading a place: the shade under the copy, the opener above it, the dots centred on the content column. */
  .gallery-header::before { content:""; position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(transparent 35%,var(--catalog-image-shade)); }
  .gallery-header .gallery-open { z-index:2; }
  .gallery-header .gallery-dots { left:calc(50% + var(--place-leading-inset,0px)/2); }
</style>
