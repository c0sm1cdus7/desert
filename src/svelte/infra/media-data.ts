import { BankVersion } from "../../interaction/bank-node.ts";
import type { CatalogHomeNode, CatalogItemNode } from "../../public-catalog/node-schema.ts";
import { mediaArtwork, type MediaItem, type MediaLibrary } from "../../views/media-library.ts";
import type { ResolvedView } from "../../views/resolved.ts";
import type { PlaceIdentity } from "./place-identity.ts";
import type { WorkspaceSearchResult } from "./workspace-search.ts";

export const viewMedia = (resolved: ResolvedView) =>
  resolved.view.content.find(item => item.kind === "media-library")?.library;
export const mediaAlbum = (library: MediaLibrary, album: string | null) =>
  library.albums.find(item => item.id === album);
export function mediaItems(library: MediaLibrary, album: string | null): readonly MediaItem[] {
  const selected = mediaAlbum(library, album);
  return selected ? selected.items.map(id => library.items.find(item => item.id === id)!) : library.items;
}
export function mediaIdentity(library: MediaLibrary, album: string | null, home: PlaceIdentity): PlaceIdentity {
  const selected = mediaAlbum(library, album);
  const items = selected ? mediaItems(library, album) : library.featured.map(id => {
    const cover = library.albums.find(item => item.id === id)!.cover;
    return library.items.find(item => item.id === cover)!;
  });
  const images = items.flatMap(item => { const image = mediaArtwork(item); return image ? [image] : []; });
  const noun = items.every(item => item.kind === "image") ? "image" : "item";
  return {
    ...(selected ? { title: selected.title, subtitle: `${items.length} ${noun}${items.length === 1 ? "" : "s"}` } : home),
    ...(images.length ? { media: { kind: "gallery" as const, images } } : {}),
  };
}
function mediaCard(item: MediaItem): CatalogItemNode {
  const base = { version: BankVersion, kind: "catalog.card" as const, presentation: "item" as const,
    record: `${item.kind}.${item.id}`, title: item.title };
  return item.kind === "image" ? { ...base, image: item.image } : {
    ...base, mediaType: item.kind, ...(item.artwork ? { image: item.artwork } : {}),
  };
}
/** Catalog data projection only: existing owners keep every visual and interaction rule. */
export function mediaContent(library: MediaLibrary, album: string | null): CatalogHomeNode {
  const items = mediaItems(library, album);
  const albums = library.albums.map(item => ({ ...mediaCard(library.items.find(media => media.id === item.cover)!),
    record: `album.${item.id}`, title: item.title }));
  const kinds = [{ kind: "image", title: "Images" }, { kind: "video", title: "Videos" }, { kind: "audio", title: "Music" }];
  const groups = [
    ...(album ? [] : [{ id: "albums", title: "Albums", items: albums }]),
    ...kinds.flatMap(({ kind, title }) => {
      const matches = items.filter(item => item.kind === kind).map(mediaCard);
      return matches.length ? [{ id: kind, title, items: matches }] : [];
    }),
  ];
  return { version: BankVersion, kind: "catalog.home", groups,
    featured: { ...groups[0]!.items[0]!, presentation: "featured", eyebrow: "Media", actionLabel: "Open" } };
}
export function mediaTarget(library: MediaLibrary, record: string) {
  const album = library.albums.find(item => `album.${item.id}` === record);
  if (album) return { kind: "album" as const, album };
  const item = library.items.find(item => `${item.kind}.${item.id}` === record);
  return item ? { kind: "item" as const, item } : null;
}
export function mediaResults(library: MediaLibrary, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results = [
    ...library.albums.map(album => ({ id: `album.${album.id}`, title: album.title,
      description: `Album · ${album.items.length} items` })),
    ...library.items.map(item => ({ id: `${item.kind}.${item.id}`, title: item.title,
      description: item.kind === "image" ? "Image" : item.kind === "video" ? "Video" : "Music" })),
  ];
  return results.filter(item => terms.every(term => item.title.toLocaleLowerCase().includes(term)))
    .map(item => ({ kind: "content" as const, ...item }));
}
