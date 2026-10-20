<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import { imageSource } from './source.ts';
  let { source, alt, edge = 640, zoom = 1, retry = false, onready, fallback = 'Image unavailable' }: {
    source: string; alt: string; edge?: number; zoom?: number; retry?: boolean;
    onready?: () => void; fallback?: string;
  } = $props();
  let host!: HTMLDivElement;
  let measured = $state(0), attempt = $state(0), ready = $state(''), failed = $state('');
  let original = $state('');
  const url = $derived(original === source ? source : imageSource(source, (measured || edge) * zoom));
  // A new asset gets a new DOM image immediately. A larger rendition of the SAME
  // asset keeps its decoded pixels while loading, so pinch/resize never flashes.
  const identity = $derived(`${source}|${attempt}`);
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
    if (url !== source) { original = source; return; }
    failed = key;
  }
</script>

<div bind:this={host} data-media-image data-image-state={failed === identity ? 'error' : ready === identity ? 'ready' : 'loading'}>
  {#key identity}
    {@const key = identity}
    <img src={url} {alt} decoding="async" draggable="false" style:visibility={ready === key && failed !== key ? 'visible' : 'hidden'}
      onload={event => loaded(event.currentTarget as HTMLImageElement, key)} onerror={() => error(key)} />
  {/key}
  {#if failed === identity}
    <div data-media-error role="img" aria-label={alt}>
      <span>{fallback}</span>
      {#if retry}<Button variant="secondary" onclick={() => { original = ''; attempt++; }}>Retry</Button>{/if}
    </div>
  {/if}
</div>
