import assert from "node:assert/strict";
import test from "node:test";
import { Check } from "@sinclair/typebox/value";
import { MediaLibrarySchema, checkMediaLibrary } from "../src/views/media-library.ts";
import { mediaContent, mediaIdentity, mediaResults } from "../src/svelte/views/media-data.ts";
import { requireViewMediaBindings } from "../src/build/media-references.ts";
import { program } from "./fixtures/view-program.ts";

const library = {
  id: "mixed", items: [
    { id: "photo", kind: "image", title: "Coast", image: { asset: "coast", alt: "Rocky coast" } },
    { id: "film", kind: "video", title: "Coast film", source: { asset: "film" },
      artwork: { asset: "coast", alt: "Film poster" },
      captions: [{ asset: "film-captions", language: "en", label: "English" }] },
    { id: "song", kind: "audio", title: "Quiet tones", source: { asset: "song" } },
  ],
  albums: [{ id: "all", title: "Mixed album", cover: "photo", items: ["photo", "film", "song"] }],
  featured: ["all"],
} as const;

test("one closed Media contract admits images, video and audio with truthful optional artwork", () => {
  assert.equal(Check(MediaLibrarySchema, library), true);
  checkMediaLibrary(library);
  for (const bad of [
    { ...library.items[1], source: { url: "https://example.com/video.mp4" } },
    { ...library.items[2], autoplay: true },
    { ...library.items[2], kind: "music" },
    { ...library.items[1], captions: [{ asset: "captions", language: "", label: "English" }] },
  ]) assert.equal(Check(MediaLibrarySchema, { ...library, items: [bad] }), false);
  assert.throws(() => checkMediaLibrary({ ...library,
    albums: [{ ...library.albums[0], items: ["missing"] }] }), /UNKNOWN_ALBUM_MEDIA_ITEM/);
});

test("Media groups each kind once and never invents cover art for audio", () => {
  const content = mediaContent(library, null);
  assert.deepEqual(content.groups.map(group => group.title), ["Albums", "Images", "Videos", "Music"]);
  assert.deepEqual(content.groups[3]?.items[0], {
    version: "desert.bank-node/1", kind: "catalog.card", presentation: "item",
    record: "audio.song", title: "Quiet tones", mediaType: "audio",
  });
  assert.equal(mediaIdentity(library, "all", { title: "Media", subtitle: "Your media" }).subtitle, "3 items");
  assert.deepEqual(mediaResults(library, "tones").map(result => result.id), ["audio.song"]);
});

test("host bindings match each declared media role before a build can be served", () => {
  const candidate = { ...program, views: [...program.views, { version: "desert.view/1", id: "mixed",
    content: [{ kind: "media-library", id: "library", library }] }] } as const;
  const assets = [{ id: "coast", mediaType: "image/png" }, { id: "film", mediaType: "video/webm" },
    { id: "song", mediaType: "audio/wav" }, { id: "film-captions", mediaType: "text/vtt" }];
  requireViewMediaBindings(candidate, assets);
  for (const asset of assets) assert.throws(() => requireViewMediaBindings(candidate,
    assets.map(item => item.id === asset.id ? { ...item, mediaType: "application/octet-stream" } : item)),
    /VIEW_MEDIA_KIND_MISMATCH/);
});
