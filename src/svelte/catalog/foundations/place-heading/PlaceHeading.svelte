<script lang="ts">
  import { Gallery, Heading, MediaPlayer } from "../../index.ts";
  import { catalogPhotos, mediaSource } from "../../../infra/media-source.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, subtitle, media, context, background }: CatalogProps<"place-heading"> = $props();
  let failed = $state(false);
  $effect(() => { media; background?.asset; failed = false; });
</script>

{#if context === "place"}
<!-- The sole semantic page heading stays mounted; chrome mirrors only identity. -->
<!-- A gallery of several photos pages with dots under the copy (data-paged-media). -->
<div class="place-heading-content" data-place-header data-featured-media={media?.kind} data-media-unavailable={failed}
  data-paged-media={(media?.kind === 'gallery' && media.images.length > 1) || undefined}>
  {#if media && !failed}
    {#if media.kind === 'image' || media.kind === 'gallery'}
      {@const photos = catalogPhotos(media.kind === 'gallery' ? media.images : [media])}
      {#key photos.map(photo=>photo.source).join('|')}
        <div class="place-heading-gallery"><Gallery {photos} {title} presentation="header" fit="fill" aspect="fill" /></div>
      {/key}
    {:else}
      <!-- The video plays with the player's header controls (DESIGN §7 item 6), under the heading's shade. -->
      <div class="place-heading-media" data-header-media>
        <MediaPlayer item={{ kind: "video", source: mediaSource(media.asset), alt: media.alt, captions: [],
          ...(media.poster ? { artwork: { source: mediaSource(media.poster), alt: media.alt } } : {}) }}
          presentation="header" onunavailable={() => failed = true} />
      </div>
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
