<script lang="ts">
  // F1-merge: the viewer mounts Modal (presentation media) instead of the vendor dialog, and Bar (top, dialog identity,
  // close as leading, zoom out/in/reset as trailing icon Actions) instead of ToolbarLayout's media header.
  import * as Dialog from '../../../vendor/components/ui/dialog/index.js';
  import { Action, Image, MediaPlayer, ToolbarLayout } from '../../index.ts';
  import { mediaGestures } from '../../mechanisms/media-gestures/media-gestures.ts';
  import { imageIdentity } from '../../../infra/media-source.ts';
  import MediaStrip from './MediaStrip.svelte';
  import type { CatalogProps } from '../../types.d.ts';
  let { items, title, index, open, onindex, onopenchange }: CatalogProps<"media-viewer"> = $props();
  let scale = $state(1), closeButton = $state<HTMLButtonElement | null>(null);
  let player = $state<{ toggle(): Promise<void>; stop(): void } | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  let opener: HTMLElement | null = null, shown = false;
  const selected = $derived(items[index] ?? items[0]);
  // The opener is captured before the dialog takes focus, and focus returns to it when the viewer closes.
  $effect.pre(() => {
    if (open && !shown) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    shown = open;
  });
  function select(next: number) { player?.stop(); onindex?.(Math.max(0, Math.min(items.length - 1, next))); gesture?.reset(); }
  function changeOpen(value: boolean) { if (!value) player?.stop(); onopenchange?.(value); }
  function manipulate(element: HTMLDivElement) {
    gesture = mediaGestures(element, { image: () => element.querySelector('img'), page: direction => select(index + direction),
      canPage: () => items.length > 1, zoomable: selected?.kind === 'image', onzoom: value => scale = value,
      ignore: target => target.closest('[data-media-band]') !== null });
    return { destroy: () => gesture?.destroy() };
  }
  const within = (event: KeyboardEvent, selector: string) => event.target instanceof Element && event.target.closest(selector) !== null;
  function key(event: KeyboardEvent) {
    if (within(event, 'input,[role="slider"],[data-media-thumbs]')) return;
    const image = selected?.kind === 'image';
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); if (scale === 1) select(index + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.code === 'Space' && !image && !within(event, 'button')) { event.preventDefault(); void player?.toggle(); }
    else if (image && (event.key === '+' || event.key === '=')) { event.preventDefault(); gesture?.zoom(scale + 1); }
    else if (image && event.key === '-') { event.preventDefault(); gesture?.zoom(scale - 1); }
    else if (image && event.key === '0') { event.preventDefault(); gesture?.reset(); }
  }
</script>

{#snippet paging()}
  {#if items.length > 1}
    <span class="viewer-page viewer-previous"><Action label="Previous media" icon="previous" face="icon" emphasis="secondary" type="button"
      state={index === 0 || scale > 1 ? "unavailable" : "ready"} onclick={() => select(index - 1)} /></span>
    <span class="viewer-page viewer-next"><Action label="Next media" icon="next" face="icon" emphasis="secondary" type="button"
      state={index === items.length - 1 || scale > 1 ? "unavailable" : "ready"} onclick={() => select(index + 1)} /></span>
  {/if}
{/snippet}

<Dialog.Root {open} onOpenChange={changeOpen}>
  <Dialog.Content presentation="media" data-media-viewer
    onOpenAutoFocus={event => { event.preventDefault(); closeButton?.focus({ preventScroll: true }); }}
    onCloseAutoFocus={event => { event.preventDefault(); if (opener?.isConnected) opener.focus({ preventScroll: true }); }} onkeydown={key}>
    <ToolbarLayout identity={{ title, subtitle: `${index + 1} / ${items.length}` }} identityRole="dialog" oncloseElement={element => closeButton = element}
      content={{ kind: "media-header", close: () => changeOpen(false), zoom: selected?.kind === 'image'
        ? { scale, onzoom: value => gesture?.zoom(value), onreset: () => gesture?.reset() } : undefined }} />
    <Dialog.Description class="sr-only">Swipe or use arrows to change media. Pinch, double-click or use plus and minus to zoom images. Space plays or pauses audio and video. Escape closes the viewer.</Dialog.Description>
    {#if selected}
      {#key `${index}:${imageIdentity(selected.source)}`}
        {#if selected.kind === 'image'}
          <div class="viewer-stage" use:manipulate data-media-stage>
            <Image source={selected.source} alt={selected.alt} edge={1920} zoom={scale} retry fit="fit" backdrop="none" onready={() => gesture?.refresh()} />
            {@render paging()}
          </div>
          {#if items.length > 1}<div class="viewer-band"><div class="viewer-band-row"><MediaStrip {items} {index} fill={false} onindex={select} /></div></div>{/if}
        {:else}
          <div class="viewer-playable" use:manipulate>
            <MediaPlayer bind:this={player} item={selected} presentation="viewer">
              {#snippet overlay()}{@render paging()}{/snippet}
              {#snippet strip()}{#if items.length > 1}<MediaStrip {items} {index} fill onindex={select} />{/if}{/snippet}
            </MediaPlayer>
          </div>
        {/if}
      {/key}
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  @layer components {
    .viewer-stage { position:relative; flex:1; min-height:0; overflow:hidden; touch-action:none; }
    .viewer-playable { display:flex; flex:1; flex-direction:column; min-height:0; }
    .viewer-page { position:absolute; top:50%; transform:translateY(-50%); }
    .viewer-previous { left:12px; }
    .viewer-next { right:12px; }
    /* The thumbnails band of an image set keeps the toolbar's media geometry. */
    .viewer-band { flex-shrink:0; min-width:0; padding:var(--catalog-toolbar-inset,8px); container:toolbar / inline-size;
      max-height:min(50dvh,calc(100dvh - 10rem)); overflow-y:auto; overscroll-behavior:contain; }
    .viewer-band-row { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:var(--toolbar-gap,12px); min-width:0;
      min-height:var(--catalog-toolbar-height,44px); }
  }
  @media(max-width:600px) { .viewer-page { top:auto; bottom:8px; transform:none; } }
</style>
