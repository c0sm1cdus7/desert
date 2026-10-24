<script lang="ts">
  import {onDestroy} from 'svelte';
  import { Image } from '../../index.ts';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { imageSource } from '../../../infra/media-source.ts';
  import type { ViewerMedia } from '../../../infra/media-source.ts';
  import type { MediaPlayback } from '../../../infra/playback.svelte.ts';
  import {usePrivateImages} from '../../../infra/private-image-context.ts';
  import {privateImageResource} from '../../../infra/private-image-resource.ts';
  let { item, playback }: { item: Exclude<ViewerMedia, { kind: 'image' }>; playback: MediaPlayback } = $props();
  let privateURL=$state<string|undefined>(),privateFailed=$state(false);
  const resource=privateImageResource(usePrivateImages(),()=>{privateURL=resource.url;privateFailed=resource.failed;});
  const source=$derived(typeof item.source==='string'?item.source:privateURL);
  $effect(()=>{const asset=item.source;if(typeof asset==='string') resource.clear();else void resource.load(asset,'original');});
  onDestroy(()=>resource.dispose());
</script>

{#if item.kind === 'video'}
  <!-- svelte-ignore a11y_media_has_caption (Tracks come from the typed media item; the compiler only detects direct static children. Browser tests verify the resulting caption track.) -->
  <video data-media-player="video" use:playback.attach src={source} preload="metadata" playsinline
    poster={item.artwork ? imageSource(item.artwork.source, 1280) : undefined} aria-label={item.alt}>
    {#each item.captions as track (track.source)}
      <track kind="captions" src={track.source} srclang={track.language} label={track.label} />
    {/each}
  </video>
{:else}
  {#if item.artwork}<Image source={item.artwork.source} alt={item.artwork.alt} edge={1280} />
  {:else}<Image placeholder="audio" />{/if}
  <audio data-media-player="audio" use:playback.attach src={source} preload="metadata" aria-label={item.alt}>
    {#each item.captions as track (track.source)}
      <track kind="captions" src={track.source} srclang={track.language} label={track.label} />
    {/each}
  </audio>
{/if}
{#if playback.error||privateFailed}
  <div data-media-error role="status"><span>Media unavailable</span><Button variant="secondary" onclick={()=>{if(typeof item.source!=='string') void resource.load(item.source,'original');else playback.retry();}}>Retry</Button></div>
{/if}
