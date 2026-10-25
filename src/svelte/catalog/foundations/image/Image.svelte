<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { onMount, onDestroy } from 'svelte';
  import { Action, Icon } from '../../index.ts';
  import { imageSource, imageIdentity } from '../../../infra/media-source.ts';
  import { usePrivateImages } from '../../../infra/private-image-context.ts';
  import { privateImageResource } from '../../../infra/private-image-resource.ts';
  import { renditionWidths } from '../../../../media/rendition-policy.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { source, alt = "", edge = 640, zoom = 1, retry = false, fit = 'fill', backdrop = 'muted', frame = 'own', placeholder, onready, onunavailable,
    fallback = say(m.image.unavailable) }: CatalogProps<"image"> = $props();
  let host!: HTMLDivElement;
  let measured = $state(0), attempt = $state(0), ready = $state(''), failed = $state('');
  let original = $state('');
  let privateURL = $state<string | undefined>(), privateReference = $state<string | undefined>(), privateFailed = $state(false), privateRevision = $state(0);
  const resource = privateImageResource(usePrivateImages(),
    () => { privateURL = resource.url; privateReference = resource.reference; privateFailed = resource.failed; privateRevision = resource.revision; });
  const requestedEdge = $derived((measured || edge) * zoom);
  const variant = $derived(renditionWidths.find(width => width >= requestedEdge) ?? 2560);
  const sourceIdentity = $derived(source === undefined ? '' : imageIdentity(source));
  const url = $derived(source === undefined ? undefined : typeof source === 'string'
    ? original === source ? source : imageSource(source, requestedEdge)
    : privateReference === source.reference ? privateURL : undefined);
  const privateError = $derived(typeof source === 'object' && privateReference === source.reference && privateFailed);
  $effect(() => {
    const asset = source, rendition = variant; attempt;
    if (typeof asset !== 'object') { resource.clear(); return; }
    void resource.load(asset, rendition);
  });
  onDestroy(() => resource.dispose());
  // A new asset gets a new DOM image immediately. A larger rendition of the SAME
  // asset keeps its decoded pixels while loading, so pinch/resize never flashes.
  const identity = $derived(`${sourceIdentity}|${typeof source === 'object' ? privateRevision : 0}|${attempt}`);
  // A placeholder is a face (law 9e) for audio and video; unavailable media is a notice.
  const face = $derived(placeholder === 'audio' || placeholder === 'video');
  const status = $derived(placeholder ? 'placeholder' : failed === identity || privateError ? 'error' : url && ready === identity ? 'ready' : 'loading');
  $effect(() => { if (status === 'error') onunavailable?.(); });
  onMount(() => {
    const resize = () => { measured = Math.ceil(Math.max(host.clientWidth,host.clientHeight)*window.devicePixelRatio); };
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measured = Math.ceil(Math.max(entry.contentRect.width, entry.contentRect.height) * window.devicePixelRatio);
    });
    observer.observe(host); window.addEventListener('resize',resize);
    return () => { observer.disconnect(); window.removeEventListener('resize',resize); };
  });
  async function loaded(img: HTMLImageElement, key: string) {
    const requested = img.src;
    try { await img.decode(); } catch {
      if (requested === img.src && img.isConnected) error(key);
      return;
    }
    if (key !== identity || !img.isConnected || requested !== img.src) return;
    ready = key; onready?.();
  }
  function error(key: string) {
    if (key !== identity) return;
    // Older hosts and unsupported codecs keep an original-file fallback.
    if (typeof source === 'string' && url !== source) { original = source; return; }
    failed = key;
  }
</script>

<!-- A placeholder keeps the artwork placeholder mark, so hosts that have not migrated still place it as they placed
     ArtworkPlaceholder. It stands where a face would: the theme's one face primitive (tm-face) gives it the white ground
     and the hairline every face has (law 9e), in its host's shape. -->
<!-- Unavailable media is no placeholder face: it is the one notice of unavailable media (the media-notice utility), in an
     image's frame, as an image's error is. -->
<div bind:this={host} class={face ? "image-placeholder tm-face" : "image"} class:image-clear={backdrop === 'none'} class:image-host={frame === 'host'}
  data-media-image={face ? undefined : ""} data-media-artwork-placeholder={face ? "" : undefined}
  data-image-fit={placeholder === undefined ? fit : undefined} data-image-state={placeholder === 'unavailable' ? 'unavailable' : status}
  data-image-placeholder={face ? placeholder : undefined}
  aria-label={placeholder === 'audio' ? say(m.image.noCover) : placeholder === 'video' ? say(m.image.noPoster) : undefined}>
  {#if placeholder === 'audio'}<Icon name="music-2" size="artwork" decorative />
  {:else if placeholder === 'video'}<Icon name="film" size="artwork" decorative />
  {:else if placeholder === 'unavailable'}<div class="image-error media-notice" data-media-notice role="status"><span>{fallback}</span></div>
  {:else}
    {#key identity}
      {@const key = identity}
      {#if url}<img class="image-element" class:image-contain={fit === 'fit'} src={url} {alt} decoding="async" draggable="false"
        style:visibility={ready === key && failed !== key && !privateError ? 'visible' : 'hidden'}
        onload={event => { if (event.currentTarget instanceof HTMLImageElement) void loaded(event.currentTarget, key); }} onerror={() => error(key)} />
      {/if}
    {/key}
    {#if status === 'error'}
      <div class="image-error media-notice" data-media-error data-media-notice role="img" aria-label={alt}>
        <span>{fallback}</span>
        {#if retry}<Action label={say(m.image.retry)} icon="retry" emphasis="secondary" face="text" state="ready" type="button" onclick={() => { original = ''; attempt++; }} />{/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* The components layer, as media.css was unlayered: a contextual rule of a host that has not migrated (a viewer
     stage, a catalog card) still outranks this base geometry. */
  @layer components {
    /* An image frame takes the image radius of the family, the control's, and clips what it holds to it (the picture, its
       unavailable notice): nothing paints past the rounded shape. Set in a host's frame (a card, a thumbnail, a cover, a
       gallery, a full-bleed stage), it takes that frame's corner. Ready and filling its frame, it paints no backdrop of its own
       (the picture covers it), so nothing lighter shows past the picture's own corners; fitted, the backdrop is its letterbox. */
    .image { position:relative; width:100%; height:100%; overflow:hidden; border-radius:var(--radius-control); background:var(--muted); }
    .image[data-image-state="ready"][data-image-fit="fill"] { background:transparent; }
    .image-clear { background:transparent; }
    .image-placeholder { display:grid; place-items:center; width:100%; height:100%; border-radius:var(--radius-control); color:var(--muted-foreground); }
    /* In a host's frame (a card, a thumbnail) the host draws the edge: the notice's own stays clear (the theme's media-notice). */
    .image-host { border-radius:inherit; --media-notice-edge:transparent; }
    .image-element { display:block; width:100%; height:100%; object-fit:cover; user-select:none; }
    .image-contain { object-fit:contain; }
    .image[data-image-state="ready"] > .image-element { animation:image-in var(--dur-unfold) var(--ease-tm) both; }
    /* Failed, the image is its error alone, laid out in flow: as tall as its frame when the host gives one, as tall as its
       sentence and retry (and its inset) when it gives none, never clipped to the broken image's line. */
    .image[data-image-state="error"] > .image-element { display:none; }
    /* The notice itself (its ground, edge, inset and ink) is the theme's media-notice. */
  }
  @keyframes image-in { from { opacity:0; } to { opacity:1; } }
  @media(prefers-reduced-motion:reduce) { .image[data-image-state="ready"] > .image-element { animation:none; } }
</style>
