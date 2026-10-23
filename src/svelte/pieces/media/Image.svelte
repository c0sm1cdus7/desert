<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import { imageSource, imageIdentity, type ImageSource } from './source.ts';
  import { usePrivateImages } from './private-image-context.ts';
  import { privateImageResource } from './private-image-resource.ts';
  import { renditionWidths } from '../../../media/rendition-policy.ts';
  let { source, alt, edge = 640, zoom = 1, retry = false, fit = 'fill', onready, fallback = 'Image unavailable' }: {
    source: ImageSource; alt: string; edge?: number; zoom?: number; retry?: boolean;
    fit?: 'fill' | 'fit';
    onready?: () => void; fallback?: string;
  } = $props();
  let host!: HTMLDivElement;
  let measured = $state(0), attempt = $state(0), ready = $state(''), failed = $state('');
  let original = $state('');
  let privateURL = $state<string | undefined>(), privateReference = $state<string | undefined>(), privateFailed = $state(false), privateRevision = $state(0);
  const resource = privateImageResource(usePrivateImages(),
    () => { privateURL = resource.url; privateReference = resource.reference; privateFailed = resource.failed; privateRevision = resource.revision; });
  const requestedEdge = $derived((measured || edge) * zoom);
  const variant = $derived(renditionWidths.find(width => width >= requestedEdge) ?? 2560);
  const sourceIdentity = $derived(imageIdentity(source));
  const url = $derived(typeof source === 'string'
    ? original === source ? source : imageSource(source, requestedEdge)
    : privateReference === source.reference ? privateURL : undefined);
  const privateError = $derived(typeof source !== 'string' && privateReference === source.reference && privateFailed);
  $effect(() => {
    const asset = source, rendition = variant; attempt;
    if (typeof asset === 'string') { resource.clear(); return; }
    void resource.load(asset, rendition);
  });
  onDestroy(() => resource.dispose());
  // A new asset gets a new DOM image immediately. A larger rendition of the SAME
  // asset keeps its decoded pixels while loading, so pinch/resize never flashes.
  const identity = $derived(`${sourceIdentity}|${typeof source === 'string' ? 0 : privateRevision}|${attempt}`);
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

<div bind:this={host} data-media-image data-image-fit={fit} data-image-state={failed === identity || privateError ? 'error' : url && ready === identity ? 'ready' : 'loading'}>
  {#key identity}
    {@const key = identity}
    {#if url}<img src={url} {alt} decoding="async" draggable="false" style:visibility={ready === key && failed !== key && !privateError ? 'visible' : 'hidden'}
      onload={event => loaded(event.currentTarget as HTMLImageElement, key)} onerror={() => error(key)} />
    {/if}
  {/key}
  {#if failed === identity || privateError}
    <div data-media-error role="img" aria-label={alt}>
      <span>{fallback}</span>
      {#if retry}<Button variant="secondary" onclick={() => { original = ''; attempt++; }}>Retry</Button>{/if}
    </div>
  {/if}
</div>
