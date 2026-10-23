import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { closed, name, text } from "./definition.ts";

const artwork = closed({ asset: name, alt: text });
const timed = {
  id: name, title: text, source: closed({ asset: name }), artwork: Type.Optional(artwork),
  captions: Type.Optional(Type.Array(closed({ asset: name, language: text, label: text }), { maxItems: 16 })),
};
export const MediaItemSchema = Type.Union([
  closed({ id: name, kind: Type.Literal("image"), title: text, image: artwork }),
  closed({ ...timed, kind: Type.Literal("video") }),
  closed({ ...timed, kind: Type.Literal("audio") }),
]);
export type MediaItem = Frozen<Static<typeof MediaItemSchema>>;

/** Logical asset references only; serving and verification belong to the host. */
export const MediaLibrarySchema = closed({
  id: name,
  items: Type.Array(MediaItemSchema, { minItems: 1, maxItems: 512 }),
  albums: Type.Array(closed({
    id: name, title: text, cover: name,
    items: Type.Array(name, { minItems: 1, maxItems: 512, uniqueItems: true }),
  }), { minItems: 1, maxItems: 64 }),
  featured: Type.Array(name, { minItems: 1, maxItems: 10, uniqueItems: true }),
});

export type MediaLibrary = Frozen<Static<typeof MediaLibrarySchema>>;

/** Album membership may overlap; identities and references never resolve globally. */
export function checkMediaLibrary(library: MediaLibrary): void {
  const items = new Set(library.items.map(item => item.id));
  const albums = new Set(library.albums.map(album => album.id));
  if (items.size !== library.items.length) throw new Error("DUPLICATE_MEDIA_ITEM_ID");
  if (albums.size !== library.albums.length) throw new Error("DUPLICATE_MEDIA_ALBUM_ID");
  for (const album of library.albums) {
    if (album.items.some(id => !items.has(id))) throw new Error("UNKNOWN_ALBUM_MEDIA_ITEM");
    if (!album.items.includes(album.cover)) throw new Error("INVALID_MEDIA_ALBUM_COVER");
  }
  if (library.featured.some(id => !albums.has(id))) throw new Error("UNKNOWN_FEATURED_MEDIA_ALBUM");
}

export const mediaArtwork = (item: MediaItem) => item.kind === "image" ? item.image : item.artwork;

export function mediaLibraryAssets(library: MediaLibrary): readonly string[] {
  return [...new Set(library.items.flatMap(item => item.kind === "image" ? [item.image.asset] : [
    item.source.asset, ...(item.artwork ? [item.artwork.asset] : []), ...(item.captions ?? []).map(track => track.asset),
  ]))];
}
