<script lang="ts">
  import type { WebRendererProps } from '../../renderer-contracts.ts';
  import PhotoCollection from './PhotoCollection.svelte';
  import PlaybackCanvas from './PlaybackCanvas.svelte';
  import ToolbarLayout from '../ToolbarLayout.svelte';
  import { mediaPlayback } from './playback.svelte.ts';
  import type { ViewerMedia } from './source.ts';
  import type { AssetReference } from '../../../assets/types.ts';
  let { facts, presentation }: { facts: WebRendererProps['context']['facts']; presentation: NonNullable<WebRendererProps['context']['presentation']> } = $props();
  let source = $derived(facts[presentation.media]);
  let description = $derived(presentation.description ? facts[presentation.description] : undefined);
  let alt = $derived(typeof description === 'string' ? description : 'Image');
  let playable = $derived.by((): Exclude<ViewerMedia, { kind: 'image' }> | undefined => {
    if (typeof source !== 'object' || source === null || !('kind' in source) || source.kind !== 'asset' || !('media' in source)
      || (source.media !== 'audio' && source.media !== 'video')) return;
    return { kind: source.media, source: source as AssetReference, alt, captions: [] };
  });
  const playback = mediaPlayback();
</script>

<figure data-media-object data-composition="media-object">
  {#if playable}
    <div data-media-object-player><PlaybackCanvas item={playable} {playback} /></div>
    <ToolbarLayout content={{ kind: 'media-controls', items: [playable], index: 0, onindex: () => {}, playback }} />
  {:else if typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'asset' && 'reference' in source && typeof source.reference === 'string'}
    <PhotoCollection photos={[{source:source as AssetReference,alt}]} title="Image" fit="fit" />
  {:else if typeof source === 'string' && source.startsWith('/') && !source.startsWith('//')}
    <PhotoCollection photos={[{source,alt}]} title="Image" fit="fit" />
  {:else}<span data-media-artwork-placeholder>Media unavailable</span>{/if}
  {#if description}<figcaption>{description}</figcaption>{/if}
</figure>
