import test from "node:test";
import assert from "node:assert/strict";
import { Check } from "@sinclair/typebox/value";
import { MediaLibrarySchema } from "../src/index.ts";
import type { MediaLibrary } from "../src/views/media-library.ts";
// Compiled data: the library's titles are resolved text here; the declared form is covered by tests/view-authoring.
import { compiledView as view } from "../src/views/view.ts";

const library = {
  id: "travel", items: [
    { id: "coast", kind: "image", title: "Coast", image: { asset: "coast-photo", alt: "A rocky coast" } },
    { id: "peak", kind: "image", title: "Peak", image: { asset: "peak-photo", alt: "A mountain peak" } },
  ],
  albums: [
    { id: "journey", title: "Journey", cover: "coast", items: ["coast", "peak"] },
    { id: "favorites", title: "Favorites", cover: "peak", items: ["peak"] },
  ], featured: ["journey", "favorites"],
} as const satisfies MediaLibrary;
const header = { kind: "header", id: "heading", title: "Media", subtitle: "Your albums and items." };
const content = (value: unknown) => ({ kind: "media-library", id: "library", library: value });
const definition = (value: unknown = library) => ({ version: "desert.view/1", id: "media", content: [header, content(value)] });
const reject = (value: unknown, message = "INVALID_VIEW") => assert.throws(() => view(definition(value)), { message });

test("Media libraries declare ordered album covers and items, allowing shared album membership", () => {
  assert.equal(Check(MediaLibrarySchema, library), true);
  const result = view(definition());
  assert.deepEqual(result.content, [header, content(library)]);
  const media = result.content[1];
  assert.equal(media?.kind, "media-library");
  if (media?.kind !== "media-library") assert.fail("Expected media content");
  assert.deepEqual(media.library.featured, ["journey", "favorites"]);
  assert.deepEqual(media.library.albums[0]?.items, ["coast", "peak"]);
  assert.equal(media.library.items[0]?.kind, "image");
  const first = media.library.items[0];
  for (const value of [media, media.library, media.library.items, first?.kind === "image" ? first.image : null,
    media.library.albums, media.library.albums[0]?.items, MediaLibrarySchema]) assert.ok(Object.isFrozen(value));
});

test("Media references resolve within the library; a cover must belong to its own album", () => {
  reject({ ...library, featured: ["missing"] }, "UNKNOWN_FEATURED_MEDIA_ALBUM");
  reject({ ...library, albums: [{ ...library.albums[0], items: ["missing"] }] }, "UNKNOWN_ALBUM_MEDIA_ITEM");
  reject({ ...library, albums: [{ ...library.albums[0], cover: "missing" }] }, "INVALID_MEDIA_ALBUM_COVER");
  reject({ ...library, albums: [{ ...library.albums[0], cover: "coast", items: ["peak"] }] }, "INVALID_MEDIA_ALBUM_COVER");
  reject({ ...library, items: [library.items[0], library.items[0]] }, "DUPLICATE_MEDIA_ITEM_ID");
  reject({ ...library, albums: [library.albums[0], library.albums[0]] }, "DUPLICATE_MEDIA_ALBUM_ID");
  reject({ ...library, featured: ["journey", "journey"] });
  reject({ ...library, albums: [{ ...library.albums[0], items: ["coast", "coast"] }] });
});

test("Media is a closed root composition, not a stack leaf or a styling escape hatch", () => {
  for (const extra of [{ style: "padding:0" }, { class: "custom" }, { render: "Gallery" }, { controller: "media" }]) {
    reject({ ...library, ...extra });
    reject({ ...library, items: [{ ...library.items[0], ...extra }] });
    reject({ ...library, items: [{ ...library.items[0], image: { ...library.items[0].image, ...extra } }] });
    reject({ ...library, albums: [{ ...library.albums[0], ...extra }] });
  }
  for (const id of ["https://example.com/a.jpg", "/a", "../a", "", " a"]) {
    reject({ ...library, id });
    reject({ ...library, items: [{ ...library.items[0], image: { asset: id, alt: "Photo" } }] });
  }
  assert.throws(() => view({ ...definition(), content: [{ kind: "stack", id: "stack", title: "Media", items: [content(library)] }] }),
    { message: "INVALID_VIEW" });
  assert.throws(() => view({ ...definition(), content: [header, { ...content(library), id: "heading" }] }),
    { message: "DUPLICATE_VIEW_CONTENT_ID" });
});

test("Media cardinality limits reject empty and unbounded declarations", () => {
  for (const field of ["items", "albums", "featured"]) reject({ ...library, [field]: [] });
  reject({ ...library, items: Array.from({ length: 513 }, (_, i) => ({ ...library.items[0], id: `photo-${i}` })) });
  reject({ ...library, albums: Array.from({ length: 65 }, (_, i) => ({ ...library.albums[0], id: `album-${i}` })) });
  reject({ ...library, featured: Array.from({ length: 11 }, (_, i) => `album-${i}`) });
  reject({ ...library, albums: [{ ...library.albums[0], items: [] }] });
  reject({ ...library, albums: [{ ...library.albums[0], items: Array.from({ length: 513 }, (_, i) => `photo-${i}`) }] });
});
