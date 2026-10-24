<script lang="ts">
  // Closed library interaction: cards, local album intent, viewer queue and focus return.
  import { setContext } from "svelte";
  import { mediaArtwork } from "../../../../views/media-library.ts";
  import { CatalogHome } from "../../index.ts";
  import { Viewer } from "../../index.ts";
  import { viewerMedia, type ViewerMedia } from "../../../infra/media-source.ts";
  import { mediaContent, mediaItems, mediaTarget, mediaAlbum } from "../../../infra/media-data.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { library, album, onalbum }: CatalogProps<"library"> = $props();
  let owner: HTMLDivElement;
  let open = $state(false), index = $state(0), title = $state("");
  let items = $state.raw<readonly ViewerMedia[]>([]);
  let opener: HTMLElement | null = null;
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
    title = inAlbum ? mediaAlbum(library, album)?.title ?? "Media" : "Media";
    opener = owner.querySelector<HTMLElement>(`[data-record="${CSS.escape(record)}"] button`);
    open = true;
    return true;
  }
  function returnFocus() {
    const target = opener?.isConnected && opener.checkVisibility() ? opener
      : owner.closest<HTMLElement>("[data-catalog-scroll]");
    target?.focus({ preventScroll: true });
  }
</script>

<div bind:this={owner} data-media-library={library.id} data-media-album={album ?? undefined}>
  <CatalogHome node={mediaContent(library, album)} bodyOnly
    onevent={event => { if (event.kind === "catalog.open") select(event.record); }} />
  {#if open}<Viewer {items} {title} {index} {open} onindex={value => index=value} onopen={value => open=value} onreturn={returnFocus} />{/if}
</div>
