import { test } from "node:test";
import assert from "node:assert/strict";
import type { MediaLibrary } from "../src/views/media-library.ts";
import { mediaContent, mediaIdentity, mediaTarget, mediaResults, mediaItems } from "../src/svelte/infra/media-data.ts";

const library = {
  id: "library", items: [
    { id: "one", kind: "image", title: "First image", image: { asset: "photo-one", alt: "First photo" } },
    { id: "two", kind: "image", title: "Second image", image: { asset: "photo-two", alt: "Second photo" } },
  ], albums: [
    { id: "favorites", title: "Favorites", cover: "two", items: ["two", "one"] },
    { id: "all", title: "All", cover: "one", items: ["one", "two"] },
  ], featured: ["favorites", "all"],
} as const satisfies MediaLibrary;
const identity = { title: "Media", subtitle: "Your library." };

test("Media projects album covers and items into the existing catalog without duplicating navigation targets", () => {
  const content = mediaContent(library, null);
  assert.deepEqual(content.groups.map(group => group.title), ["Albums", "Images"]);
  assert.deepEqual(content.groups[0]!.items.map(item => item.record), ["album.favorites", "album.all"]);
  assert.deepEqual(content.groups[1]!.items.map(item => item.record), ["image.one", "image.two"]);
  assert.equal(content.groups[0]!.items[0]!.image?.asset, "photo-two");
  assert.deepEqual(mediaIdentity(library, null, identity).media, {
    kind: "gallery", images: [library.items[1]!.image, library.items[0]!.image],
  });
});

test("an album preserves its own photo order and has an independent identity", () => {
  const album = mediaIdentity(library, "favorites", identity);
  assert.equal(album.title, "Favorites");
  assert.equal(album.subtitle, "2 images");
  assert.deepEqual(mediaItems(library, "favorites").map(image => image.id), ["two", "one"]);
  assert.deepEqual(mediaContent(library, "favorites").groups[0]!.items.map(item => item.record), ["image.two", "image.one"]);
});

test("overlay search resolves only declared local media targets", () => {
  assert.deepEqual(mediaResults(library, "first").map(result => result.id), ["image.one"]);
  assert.deepEqual(mediaResults(library, "favorites").map(result => result.id), ["album.favorites"]);
  assert.equal(mediaTarget(library, "image.missing"), null);
  assert.equal(mediaTarget(library, "album.favorites")?.kind, "album");
  assert.deepEqual(mediaResults(library, "  "), []);
});
