<script lang="ts">
  // The viewer is a media Modal: the modal names it by its title, dismisses it on Escape and returns focus to what opened it.
  // F1-merge: Bar (top, dialog identity, close as leading, zoom out/in/reset as trailing icon Actions) replaces
  // ToolbarLayout's media header once Bar's commands can carry zoom: they are surface intents today, and zoom is not one.
  import { Action, Image, MediaPlayer, Modal, ToolbarLayout } from '../../index.ts';
  import { mediaGestures } from '../../mechanisms/media-gestures/media-gestures.ts';
  import { provideCloseFocus, provideOpenFocus } from '../../mechanisms/surface-focus/focus-return.ts';
  import { imageIdentity } from '../../../infra/media-source.ts';
  import { useFocusScope } from '../../../infra/focus-scope.ts';
  import MediaStrip from './MediaStrip.svelte';
  import type { CatalogProps } from '../../types.d.ts';
  let { items, title, index, open, returnFocus, onindex, onopenchange }: CatalogProps<"media-viewer"> = $props();
  let scale = $state(1), viewer = $state<HTMLDivElement | null>(null), closeButton = $state<HTMLButtonElement | null>(null);
  let player = $state<{ toggle(): Promise<void>; stop(): void } | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  let anchor = $state<HTMLElement | null>(null), region: HTMLElement | null = null;
  const scope = useFocusScope();
  const selected = $derived(items[index] ?? items[0]);
  // Opening lands on Close, as the viewer always has.
  provideOpenFocus(event => { event.preventDefault(); closeButton?.focus({ preventScroll: true }); });
  // The scroll region the viewer was opened in, kept while the caller unmounts the viewer as it closes.
  $effect(() => { if (anchor) region = anchor.closest<HTMLElement>('[data-catalog-scroll]'); });
  // Closing returns focus to the opener, as the modal does; a caller that names a return key gets focus back on what it
  // registered under it instead, or on the scroll region the viewer was opened in when that is gone.
  provideCloseFocus(event => {
    if (returnFocus === undefined) return;
    event.preventDefault();
    if (!scope?.focus(returnFocus)) region?.focus({ preventScroll: true });
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
  // Keys page, zoom and play wherever focus is in the viewer, its modal surface included (it takes focus on opening).
  $effect(() => {
    const surface = viewer?.closest<HTMLElement>('[data-modal="media"]');
    if (!surface) return;
    surface.addEventListener('keydown', key);
    return () => surface.removeEventListener('keydown', key);
  });
</script>

{#snippet paging()}
  {#if items.length > 1}
    <span class="viewer-page viewer-previous"><Action label="Previous media" icon="previous" face="icon" emphasis="secondary" type="button"
      state={index === 0 || scale > 1 ? "unavailable" : "ready"} onclick={() => select(index - 1)} /></span>
    <span class="viewer-page viewer-next"><Action label="Next media" icon="next" face="icon" emphasis="secondary" type="button"
      state={index === items.length - 1 || scale > 1 ? "unavailable" : "ready"} onclick={() => select(index + 1)} /></span>
  {/if}
{/snippet}

<span bind:this={anchor} hidden></span>
<Modal label={title} {open} locked={false} presentation="media" ondismiss={() => changeOpen(false)}>
  <div bind:this={viewer} class="viewer" data-media-viewer>
    <ToolbarLayout identity={{ title, subtitle: `${index + 1} / ${items.length}` }} identityRole="heading" oncloseElement={element => closeButton = element}
      content={selected?.kind === 'image' ? { kind: "media-header", close: () => changeOpen(false),
        zoom: { scale, onzoom: value => gesture?.zoom(value), onreset: () => gesture?.reset() } } : { kind: "media-header", close: () => changeOpen(false) }} />
    <p class="sr-only">Swipe or use arrows to change media. Pinch, double-click or use plus and minus to zoom images. Space plays or pauses audio and video. Escape closes the viewer.</p>
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
  </div>
</Modal>

<style>
  @layer components {
    .viewer { display:flex; flex:1; flex-direction:column; min-width:0; min-height:0; }
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
