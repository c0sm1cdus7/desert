<script lang="ts">
  // Closed library interaction: cards, local album intent, viewer queue and focus return by the opened record's key.
  import { setContext } from "svelte";
  import { mediaArtwork } from "../../../../views/media-library.ts";
  import { CatalogHome, MediaViewer } from "../../index.ts";
  import { viewerMedia, type ViewerMedia } from "../../../infra/media-source.ts";
  import { mediaContent, mediaItems, mediaTarget, mediaAlbum } from "../../../infra/media-data.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { library, album, onalbum }: CatalogProps<"library"> = $props();
  let open = $state(false), index = $state(0), title = $state(""), opened = $state("");
  let items = $state.raw<readonly ViewerMedia[]>([]);
  // The library's cards register under `catalog-return:<record>`, so the viewer returns focus to the opened record's card.
  useFocusScope() ?? provideFocusScope();
  setContext("catalog-photo-intent", (record: string) => {
    const target = mediaTarget(library, record);
    const item = target?.kind === "item" ? target.item
      : target ? library.items.find(item => item.id === target.album.cover) : undefined;
    return item ? mediaArtwork(item)?.asset : undefined;
  });
  export function select(record: string) {
    const target = mediaTarget(library, record);
    if (!target) return false;
    if (target.kind === "album") { onalbum?.(target.album.id); return true; }
    const current = mediaItems(library, album);
    // A result outside the current album opens the library queue, not a wrong index.
    const inAlbum = current.some(item => item.id === target.item.id);
    const queue = inAlbum ? current : library.items;
    index = queue.findIndex(item => item.id === target.item.id);
    items = viewerMedia(queue);
    title = inAlbum ? mediaAlbum(library, album)?.title ?? say(m.library.media) : say(m.library.media);
    opened = record;
    open = true;
    return true;
  }
</script>

<CatalogHome node={mediaContent(library, album)} bodyOnly
  onevent={event => { if (event.kind === "catalog.open") select(event.record); }} />
{#if open}<MediaViewer {items} {title} {index} {open} returnFocus={`catalog-return:${opened}`}
  onindex={value => index = value} onopenchange={value => open = value} />{/if}
