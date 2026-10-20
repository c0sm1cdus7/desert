<script lang="ts">
  import * as Dialog from '../../vendor/components/ui/dialog/index.js';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import X from '@lucide/svelte/icons/x';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ToolbarLayout from '../ToolbarLayout.svelte';
  import Image from './Image.svelte';
  import { mediaGestures } from './gestures.ts';
  import { type Photo } from './source.ts';
  let { photos, title, index = $bindable(0), open = $bindable(false), onreturn }: {
    photos: readonly Photo[]; title: string; index?: number; open?: boolean; onreturn: () => void;
  } = $props();
  let scale = $state(1), stage!: HTMLDivElement;
  let closeButton = $state<HTMLButtonElement | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  const selected = $derived(photos[index]!);
  function select(next: number) { index=Math.max(0,Math.min(photos.length-1,next)); gesture?.reset(); }
  function manipulate(element: HTMLDivElement) {
    gesture=mediaGestures(element,{ image:()=>element.querySelector('img'),
      page:direction=>select(index+direction), canPage:()=>photos.length>1, zoomable:true, onzoom:value=>scale=value });
    return { destroy:()=>gesture?.destroy() };
  }
  function key(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest('[data-media-thumbs]')) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); if (scale===1) select(index+(event.key==='ArrowRight'?1:-1));
    } else if (event.key==='+' || event.key==='=') { event.preventDefault(); gesture?.zoom(scale+1); }
    else if (event.key==='-') { event.preventDefault(); gesture?.zoom(scale-1); }
    else if (event.key==='0') { event.preventDefault(); gesture?.reset(); }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content presentation="media" showCloseButton={false} data-media-viewer
    onOpenAutoFocus={event=>{ event.preventDefault(); closeButton?.focus({preventScroll:true}); }}
    onCloseAutoFocus={event=>{ event.preventDefault(); onreturn(); }} onkeydown={key}>
    <ToolbarLayout>
      <Button bind:ref={closeButton} variant="secondary" size="icon-lg" aria-label="Close photo viewer" onclick={()=>open=false}><X /></Button>
      <div data-media-identity>
        <Dialog.Title>{title}</Dialog.Title>
        <span data-media-count>{index+1} / {photos.length}</span>
      </div>
      <div data-media-zoom-tools>
        <Button variant="secondary" size="icon-lg" aria-label="Zoom out" disabled={scale<=1} onclick={()=>gesture?.zoom(scale-1)}><Minus /></Button>
        <Button variant="secondary" aria-label="Reset zoom" onclick={()=>gesture?.reset()}><span data-media-zoom>{Math.round(scale*100)}%</span></Button>
        <Button variant="secondary" size="icon-lg" aria-label="Zoom in" disabled={scale>=4} onclick={()=>gesture?.zoom(scale+1)}><Plus /></Button>
      </div>
    </ToolbarLayout>
    <Dialog.Description class="sr-only">Swipe or use arrows to change photos. Pinch, double-click or use plus and minus to zoom. Drag to pan when zoomed. Escape closes the viewer.</Dialog.Description>
    <div bind:this={stage} use:manipulate data-media-stage>
      <Image source={selected.source} alt={selected.alt} edge={1920} zoom={scale} retry onready={()=>gesture?.refresh()} />
      {#if photos.length>1}
        <Button data-media-prev variant="secondary" size="icon-lg" aria-label="Previous photo" disabled={index===0 || scale>1} onclick={()=>select(index-1)}><ChevronLeft /></Button>
        <Button data-media-next variant="secondary" size="icon-lg" aria-label="Next photo" disabled={index===photos.length-1 || scale>1} onclick={()=>select(index+1)}><ChevronRight /></Button>
      {/if}
    </div>
    {#if photos.length>1}
      <ToolbarLayout edge="bottom">
        <div data-media-thumbs aria-label="Photos">
          {#each photos as photo, i (photo.source)}
            <Button variant="ghost" aria-label={`Photo ${i+1}: ${photo.alt}`} aria-current={i===index ? 'true' : undefined}
              onclick={()=>select(i)}><Image source={photo.source} alt="" edge={160} /></Button>
          {/each}
        </div>
      </ToolbarLayout>
    {/if}
  </Dialog.Content>
</Dialog.Root>
