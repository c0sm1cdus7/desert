<script lang="ts">
  import * as Dialog from '../../../vendor/components/ui/dialog/index.js';
  import { useSurfaceTypography } from '../../../infra/surface-typography.svelte.ts';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { Icon } from '../../index.ts';
  import { ToolbarLayout } from '../../index.ts';
  import { Image } from '../../index.ts';
  import { PlaybackCanvas } from '../../index.ts';
  import { mediaPlayback } from '../../../infra/playback.svelte.ts';
  import { mediaGestures } from '../../../infra/gestures.ts';
  import { imageIdentity } from '../../../infra/media-source.ts';
  import type { CatalogProps } from '../../types.d.ts';
  let { items, title, index, open, onindex, onopen, onreturn }: CatalogProps<"viewer"> = $props();
  let scale = $state(1);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  const selected = $derived(items[index]!);
  const playback = mediaPlayback();
  const density = useSurfaceTypography();
  function select(next: number) { playback.stop(); onindex?.(Math.max(0,Math.min(items.length-1,next))); gesture?.reset(); }
  function changeOpen(value: boolean) { if (!value) playback.stop(); onopen?.(value); }
  function manipulate(element: HTMLDivElement) {
    gesture=mediaGestures(element,{ image:()=>element.querySelector('img'),
      page:direction=>select(index+direction), canPage:()=>items.length>1, zoomable:selected.kind === 'image', onzoom:value=>scale=value });
    return { destroy:()=>gesture?.destroy() };
  }
  function key(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest('input,[role="slider"],[data-media-thumbs]')) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); if (scale===1) select(index+(event.key==='ArrowRight'?1:-1));
    } else if (event.code === 'Space' && selected.kind !== 'image' && !(event.target as HTMLElement).closest('button')) { event.preventDefault(); void playback.toggle(); }
    else if (selected.kind === 'image' && (event.key==='+' || event.key==='=')) { event.preventDefault(); gesture?.zoom(scale+1); }
    else if (selected.kind === 'image' && event.key==='-') { event.preventDefault(); gesture?.zoom(scale-1); }
    else if (selected.kind === 'image' && event.key==='0') { event.preventDefault(); gesture?.reset(); }
  }
</script>

<Dialog.Root {open} onOpenChange={changeOpen}>
  <Dialog.Content presentation="media" density={density()} data-media-viewer
    onOpenAutoFocus={event=>{ event.preventDefault(); closeButton?.focus({preventScroll:true}); }}
    onCloseAutoFocus={event=>{ event.preventDefault(); onreturn?.(); }} onkeydown={key}>
    <ToolbarLayout identity={{title,subtitle:`${index+1} / ${items.length}`}} identityRole="dialog"
      oncloseElement={element=>closeButton=element}
      content={{kind:"media-header",close:()=>changeOpen(false),zoom:selected.kind === 'image'
        ? {scale,onzoom:value=>gesture?.zoom(value),onreset:()=>gesture?.reset()} : undefined}} />
    <Dialog.Description class="sr-only">Swipe or use arrows to change media. Pinch, double-click or use plus and minus to zoom images. Space plays or pauses audio and video. Escape closes the viewer.</Dialog.Description>
    {#key `${index}:${imageIdentity(selected.source)}`}
    <div use:manipulate data-media-stage>
      {#if selected.kind === 'image'}<Image source={selected.source} alt={selected.alt} edge={1920} zoom={scale} retry onready={()=>gesture?.refresh()} />
      {:else}<PlaybackCanvas item={selected} {playback} />{/if}
      {#if items.length>1}
        <Button data-media-prev variant="secondary" size="icon-lg" aria-label="Previous media" disabled={index===0 || scale>1} onclick={()=>select(index-1)}><Icon name="chevron-left" /></Button>
        <Button data-media-next variant="secondary" size="icon-lg" aria-label="Next media" disabled={index===items.length-1 || scale>1} onclick={()=>select(index+1)}><Icon name="chevron-right" /></Button>
      {/if}
    </div>
    {/key}
    {#if items.length>1 || selected.kind !== 'image'}
      <ToolbarLayout content={{kind:"media-controls",items,index,onindex:select,playback}} />
    {/if}
  </Dialog.Content>
</Dialog.Root>
