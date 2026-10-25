<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { onDestroy } from 'svelte';
  import { Action, Image } from '../../index.ts';
  import { imageSource } from '../../../infra/media-source.ts';
  import { usePrivateImages } from '../../../infra/private-image-context.ts';
  import { privateImageResource } from '../../../infra/private-image-resource.ts';
  import { mediaPlayback } from './playback.svelte.ts';
  import Transport from './Transport.svelte';
  import Seek from './Seek.svelte';
  import Volume from './Volume.svelte';
  import type { CatalogProps } from '../../types.d.ts';
  let { item, presentation, onunavailable, overlay, strip }: CatalogProps<"media-player"> = $props();
  const playback = mediaPlayback();
  let privateURL = $state<string | undefined>(), privateFailed = $state(false);
  const resource = privateImageResource(usePrivateImages(), () => { privateURL = resource.url; privateFailed = resource.failed; });
  const source = $derived(typeof item.source === 'string' ? item.source : privateURL);
  const unavailable = $derived(playback.error || privateFailed);
  $effect(() => { const asset = item.source; if (typeof asset === 'string') resource.clear(); else void resource.load(asset, 'original'); });
  $effect(() => { if (unavailable) onunavailable?.(); });
  onDestroy(() => resource.dispose());
  /** Plays or pauses the media (the viewer's Space key). */
  export function toggle() { return playback.toggle(); }
  /** Pauses the media (the viewer pages or closes). */
  export function stop() { playback.stop(); }
  function retry() { if (typeof item.source !== 'string') void resource.load(item.source, 'original'); else playback.retry(); }
</script>

<div class="player player-{presentation}" data-media-player-presentation={presentation}>
  <!-- Unavailable, the stage shows one state: the sentence and its retry on their own ground, laid out over the media's
       box (kept, so retrying reloads the same element), the artwork and the header controls withdrawn. -->
  <div class="player-stage" class:player-stage-unavailable={unavailable}>
    {#if item.kind === 'video'}
      <!-- svelte-ignore a11y_media_has_caption (Tracks come from the typed media item; the compiler only detects direct static children. Browser tests verify the resulting caption track.) -->
      <video class="player-video" data-media-player="video" use:playback.attach src={source} preload="metadata" playsinline
        poster={item.artwork ? imageSource(item.artwork.source, 1280) : undefined} aria-label={item.alt}>
        {#each item.captions as track (track.source)}<track kind="captions" src={track.source} srclang={track.language} label={track.label} />{/each}
      </video>
    {:else}
      {#if unavailable}<!-- The error stands alone. -->
      {:else if item.artwork}<Image frame="host" source={item.artwork.source} alt={item.artwork.alt} edge={1280}
        fit={presentation === 'viewer' ? 'fit' : 'fill'} backdrop={presentation === 'viewer' ? 'none' : 'muted'} />
      {:else}<Image frame="host" placeholder="audio" />{/if}
      <audio data-media-player="audio" use:playback.attach src={source} preload="metadata" aria-label={item.alt}>
        {#each item.captions as track (track.source)}<track kind="captions" src={track.source} srclang={track.language} label={track.label} />{/each}
      </audio>
    {/if}
    {#if unavailable}
      <div class="player-error" role="status"><span>{say(m.mediaPlayer.unavailable)}</span>
        <Action label={say(m.mediaPlayer.retry)} icon="retry" emphasis="secondary" face="text" state="ready" type="button" onclick={retry} />
      </div>
    {/if}
    {@render overlay?.()}
  </div>
  {#if presentation === 'header'}
    {#if !unavailable}<div class="player-header-controls"><Transport {playback} /><Volume {playback} captions={false} /></div>{/if}
  {:else}
    <!-- The media controls band: transport, the viewer's thumbnails (strip), volume, then the seek row. -->
    <div class="player-band" data-media-band>
      <div class="player-band-row"><Transport {playback} />{@render strip?.()}<Volume {playback} captions={item.captions.length > 0} /></div>
      <Seek {playback} />
    </div>
  {/if}
</div>

<style>
  @layer components {
    .player { position:relative; display:flex; flex-direction:column; min-width:0; }
    .player-stage { position:relative; overflow:hidden; }
    /* Inline, the controls band follows the media at the stack gap, as the media object laid them out. */
    .player-inline { gap:var(--stack-gap,16px); }
    .player-inline .player-stage { height:clamp(14rem,50vh,36rem); border-radius:var(--radius-control); }
    .player-viewer { flex:1; min-height:0; }
    .player-viewer .player-stage { flex:1; min-height:0; touch-action:none; }
    .player-header { width:100%; height:100%; }
    /* Heading a place, the stage lies beneath its host's shade (which darkens the video for the title) and the controls
       stand above it, fully legible: neither the player nor its stage opens a stacking context of its own above them.
       Unavailable, the stage holds its error alone (no controls, no shade) and keeps its place in the flow. */
    .player-header .player-stage { flex:1; }
    .player-header .player-stage:not(.player-stage-unavailable) { z-index:-2; }
    .player-video { display:block; width:100%; height:100%; min-height:0; object-fit:contain; }
    /* Unavailable, the stage stacks its parts in one cell: it is as tall as its media or its error, whichever is taller, and
       the error, on the muted ground an image's error has, covers the media's box (an overlay, the viewer's paging, stays above). */
    .player-stage-unavailable { display:grid; }
    .player-stage-unavailable > .player-video, .player-stage-unavailable > .player-error { grid-area:1 / 1; }
    .player-error { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
      padding:var(--spacing-regular,1rem); background:var(--muted); color:var(--foreground); }
    /* The band keeps the toolbar's media geometry: its inset, target height and gap. */
    .player-band { flex-shrink:0; min-width:0; padding:var(--catalog-toolbar-inset,8px); container:toolbar / inline-size;
      max-height:min(50dvh,calc(100dvh - 10rem)); overflow-y:auto; overscroll-behavior:contain; }
    .player-band-row { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:var(--toolbar-gap,12px); min-width:0;
      min-height:var(--catalog-toolbar-height,44px); }
    .player-header-controls { position:absolute; inset-inline-end:16px; inset-block-end:16px; z-index:2; display:flex; gap:8px; }
  }
  /* Heading a place, the video covers the heading. Outside the layer: the playback canvas's media.css rule, unlayered,
     draws its video contained, and the player's own mark is the same. */
  .player-header .player-video { object-fit:cover; }
</style>
