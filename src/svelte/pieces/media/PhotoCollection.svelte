<script lang="ts">
  import Image from './Image.svelte';
  import Viewer from './Viewer.svelte';
  import { mediaGestures } from './gestures.ts';
  import { prefetchImage, imageIdentity, type Photo } from './source.ts';
  let { photos, title, header = false, fit = 'fill' }: { photos: readonly Photo[]; title: string; header?: boolean; fit?: 'fit'|'fill' } = $props();
  let index = $state(0), open = $state(false);
  let host!: HTMLDivElement, opener!: HTMLButtonElement;
  const selected = $derived(photos[index] ?? photos[0]!);
  function select(next: number) { index = Math.max(0,Math.min(photos.length-1,next)); }
  function drag(button: HTMLButtonElement) {
    return mediaGestures(button, { image: () => host.querySelector('img'),
      page: direction => select(index+direction), canPage:()=>photos.length>1 });
  }
  $effect(() => {
    const current = index;
    if (typeof window === 'undefined') return;
    for (const neighbor of [photos[current-1],photos[current+1]]) if (neighbor)
      prefetchImage(neighbor.source, Math.max(host?.clientWidth || 640,host?.clientHeight || 0)*window.devicePixelRatio);
  });
  function key(event: KeyboardEvent) {
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); select(index+(event.key==='ArrowRight'?1:-1));
    }
  }
</script>

<div bind:this={host} data-photo-collection data-header-collection={header || undefined}>
  <Image source={selected.source} alt={selected.alt} edge={header ? 1280 : 640} {fit} retry />
  <button type="button" bind:this={opener} use:drag data-media-open aria-label="Open photo viewer"
    onclick={() => open=true} onkeydown={key}></button>
  {#if photos.length>1}
    <div data-media-dots aria-label="Choose photo">
      {#each photos as photo, i (`${i}:${imageIdentity(photo.source)}`)}
        <button type="button" aria-label={`Photo ${i+1}: ${photo.alt}`} aria-current={i===index ? 'true' : undefined}
          onclick={() => select(i)}></button>
      {/each}
    </div>
  {/if}
</div>
{#if open}
  <Viewer items={photos.map(photo => ({kind:'image', ...photo}))} {title} {index} {open}
    onindex={value => index=value} onopen={value => open=value} onreturn={() => opener?.focus({ preventScroll:true })} />
{/if}
