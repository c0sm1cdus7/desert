import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { requireViewMediaBindings } from "../src/build/media-references.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { viewIdentity } from "../src/svelte/catalog/compositions/view-workspace/workspace-data.ts";
import type { ViewProgram } from "../src/views/program-schema.ts";
import type { ViewHeader } from "../src/views/schema.ts";
import { program, surface } from "./fixtures/view-program.ts";

const image = { kind: "image", asset: "coast", alt: "A coast" } as const;
const gallery = { kind: "gallery", images: [image, { asset: "peak", alt: "A peak" }]
  .map(({ asset, alt }) => ({ asset, alt })) } as const;
function candidate(media: NonNullable<ViewHeader["media"]>): ViewProgram {
  return { ...program, views: program.views.map((view, index) => index ? view : {
    ...view, content: view.content.map(item => item.kind === "header" ? { ...item, media } : item),
  }) };
}

test("authored image and ordered gallery headers are admitted without replacing other content", () => {
  for (const media of [image, gallery]) {
    const result = compileViewProgram(candidate(media), surface);
    assert.deepEqual(result.views[0]!.content[0], { ...program.views[0].content[0], media });
    assert.deepEqual(result.views[0]!.content.slice(1), program.views[0].content.slice(1));
    assert.ok(Object.isFrozen(result.views[0]!.content[0]));
  }
});

test("header assets participate in exact host binding closure, including every gallery item", () => {
  requireViewMediaBindings(candidate(image), [{ id: "coast", mediaType: "image/png" }]);
  requireViewMediaBindings(candidate(gallery), [{ id: "peak", mediaType: "image/png" }, { id: "coast", mediaType: "image/png" }]);
  assert.throws(() => requireViewMediaBindings(candidate(image), []), { message: "VIEW_MEDIA_BINDING_REQUIRED" });
  assert.throws(() => requireViewMediaBindings(candidate(gallery), [{ id: "coast", mediaType: "image/png" }]), { message: "VIEW_MEDIA_BINDING_REQUIRED" });
  assert.throws(() => requireViewMediaBindings(candidate(image), [{ id: "coast", mediaType: "image/png" }, { id: "extra", mediaType: "image/png" }]),
    { message: "UNREFERENCED_LOCAL_MEDIA_BINDING" });
});

test("runtime projects the exact authored header identity to the existing shared heading owner", () => {
  const model = viewProgramModel(candidate(gallery), surface, () => true);
  try {
    const snapshot = model.snapshot();
    assert.deepEqual(viewIdentity(snapshot.resolved, "Fallback").media, gallery);
    assert.equal(snapshot.resolved.top?.title, "Home");
    assert.equal(snapshot.panel, null);
    assert.deepEqual(snapshot.resolved.bindings, {});
  } finally { model.stop(); }
});

test("unsupported, competing and invalid header media fail before mounting", () => {
  for (const media of [
    { kind: "video", asset: "movie", alt: "Movie" },
    { kind: "gallery", images: [{ asset: "coast", alt: "One" }, { asset: "coast", alt: "Two" }] },
    { kind: "gallery", images: [] }, { kind: "image", asset: "../escape", alt: "Escape" },
    { ...image, style: "display:none" },
  ]) assert.throws(() => compileViewProgram(candidate(media as never), surface));
  const library = structuredClone(candidate(image)) as unknown as Record<string, any>;
  library.views[0].content = [library.views[0].content[0], { kind: "media-library", id: "library", library: {
    id: "photos", items: [{ id: "photo", kind: "image", title: "Coast", image: { asset: image.asset, alt: image.alt } }],
    albums: [{ id: "trip", title: "Trip", cover: "photo", items: ["photo"] }], featured: ["trip"],
  } }];
  assert.throws(() => compileViewProgram(library, surface), { message: "CONFLICTING_VIEW_HEADER_MEDIA" });
});

test("panel image and gallery headers use the same admitted assets without widening bound authority", () => {
  for (const media of [image, gallery]) for (const id of ["detail", "editor"]) {
    const panel = { ...program, views: program.views.map(view => view.id !== id ? view : { ...view,
      content: view.content.map(item => item.kind === "header" ? { ...item, media } : item) }) };
    const result = compileViewProgram(panel, surface);
    const header = result.views.find(view => view.id === id)!.content[0];
    assert.deepEqual(header && "media" in header && header.media, media);
    requireViewMediaBindings(result, media.kind === "image" ? [{ id: "coast", mediaType: "image/png" }] : [{ id: "coast", mediaType: "image/png" }, { id: "peak", mediaType: "image/png" }]);
    assert.throws(() => requireViewMediaBindings(result, []), /VIEW_MEDIA_BINDING_REQUIRED/);
  }
});
