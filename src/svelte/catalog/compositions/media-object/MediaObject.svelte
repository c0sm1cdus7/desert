<script lang="ts">
  import type { CatalogProps } from '../../types.d.ts';
  import { Column, Gallery, Image, MediaPlayer, Text } from '../../index.ts';
  import type { PlayableMedia } from '../../../infra/viewer-media.ts';
  import type { AssetReference } from '../../../../assets/types.ts';
  import { say } from '../../../infra/messages.ts';
  import { m } from '../../../../messages/keys.ts';
  let { facts, presentation }: CatalogProps<'media-object'> = $props();
  let source = $derived(facts[presentation.media]);
  let description = $derived(presentation.description ? facts[presentation.description] : undefined);
  let caption = $derived(typeof description === 'string' || typeof description === 'number' ? String(description).trim() || undefined : undefined);
  let alt = $derived(typeof description === 'string' ? description : say(m.mediaObject.image));
  // A private asset plays when it is audio or video and shows as a photo otherwise; a same-origin path is a photo.
  let playable = $derived.by((): PlayableMedia | undefined => {
    if (typeof source !== 'object' || !('reference' in source) || (source.media !== 'audio' && source.media !== 'video')) return;
    return { kind: source.media, source, alt, captions: [] };
  });
  let photo = $derived.by((): string | AssetReference | undefined => {
    if (typeof source === 'object' && 'reference' in source) return source;
    return typeof source === 'string' && source.startsWith('/') && !source.startsWith('//') ? source : undefined;
  });
</script>

<Column gap="regular">
  {#if playable}<MediaPlayer item={playable} presentation="inline" />
  {:else if photo !== undefined}<Gallery photos={[{ source: photo, alt }]} title={say(m.mediaObject.image)} presentation="inline" fit="fit" aspect="fill" />
  {:else}<Image placeholder="unavailable" fallback={say(m.mediaObject.unavailable)} />{/if}
  {#if caption}<Text kind="body" tone="muted" text={caption} />{/if}
</Column>
