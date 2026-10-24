<script lang="ts">
  import { Heading } from '../../index.ts';
  import type { PlaceIdentity } from '../../../infra/place-identity.ts';
  import { PhotoCollection } from '../../index.ts';
  import { catalogPhotos } from '../../../infra/media-source.ts';
  let { identity, element = $bindable(null) }: { identity: PlaceIdentity; element?: HTMLElement | null } = $props();
  let failed = $state(false);
  $effect(() => { identity.media; failed = false; });
</script>

<!-- The sole semantic page heading stays mounted; chrome mirrors only identity. -->
<div bind:this={element} class="place-heading-content" data-place-header data-featured-media={identity.media?.kind} data-media-unavailable={failed}>
  {#if identity.media && !failed}
    {#if identity.media.kind === 'image' || identity.media.kind === 'gallery'}
      {@const photos = catalogPhotos(identity.media.kind === 'gallery' ? identity.media.images : [identity.media])}
      {#key photos.map(photo=>photo.source).join('|')}
        <PhotoCollection {photos} title={identity.title} header />
      {/key}
    {:else}
      <video data-header-media src={`/media/${encodeURIComponent(identity.media.asset)}`}
        poster={identity.media.poster ? `/media/${encodeURIComponent(identity.media.poster)}` : undefined}
        aria-label={identity.media.alt} muted playsinline controls preload="metadata" onerror={() => failed = true}></video>
    {/if}
  {/if}
  <div class="place-heading-copy" data-dock-above>
    <Heading kind="page" text={identity.title} focusTarget />
    <p class="type-support" data-place-subtitle>{identity.subtitle}</p>
  </div>
</div>
