<script lang="ts">
  import { Heading } from "../../index.ts";
  import { PhotoCollection } from "../../index.ts";
  import { catalogPhotos } from "../../../infra/media-source.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, subtitle, media, context, background }: CatalogProps<"place-heading"> = $props();
  let failed = $state(false);
  $effect(() => { media; background?.asset; failed = false; });
</script>

{#if context === "place"}
<!-- The sole semantic page heading stays mounted; chrome mirrors only identity. -->
<div class="place-heading-content" data-place-header data-featured-media={media?.kind} data-media-unavailable={failed}>
  {#if media && !failed}
    {#if media.kind === 'image' || media.kind === 'gallery'}
      {@const photos = catalogPhotos(media.kind === 'gallery' ? media.images : [media])}
      {#key photos.map(photo=>photo.source).join('|')}
        <!-- F1-merge: Gallery (presentation "header", F1e) replaces the photo-collection composition. -->
        <PhotoCollection {photos} {title} header />
      {/key}
    {:else}
      <!-- F1-merge: MediaPlayer (presentation "header", F1e) replaces native controls (DESIGN §7 item 6). -->
      <video data-header-media src={`/media/${encodeURIComponent(media.asset)}`}
        poster={media.poster ? `/media/${encodeURIComponent(media.poster)}` : undefined}
        aria-label={media.alt} muted playsinline controls preload="metadata" onerror={() => failed = true}></video>
    {/if}
  {/if}
  <div class="place-heading-copy" data-dock-above>
    <Heading kind="page" text={title} focusTarget />
    <!-- F1-merge: Text (kind "support", F1a). -->
    <p class="type-support" data-place-subtitle>{subtitle}</p>
  </div>
</div>
{:else}
<!-- An embedded heading is content, never a toolbar or scroll owner. -->
<header class="place-heading" data-embedded-place-heading>
  <div class="flex min-w-0 flex-col gap-1">
    {#if background && !failed}<img src={`/media/${encodeURIComponent(background.asset)}`} alt={background.alt} onerror={() => failed = true} />{/if}
    <Heading kind="page" text={title} />
    <p class="type-support text-muted-foreground" data-place-subtitle>{subtitle}</p>
  </div>
</header>
{/if}
