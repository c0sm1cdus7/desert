import test from "node:test";
import assert from "node:assert/strict";
import { file as fileFact } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Images, application, surface, mutation, validate, program } from "./fixtures/image-input.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { inspectMutationDraft } from "../src/web/client/draft-validation.ts";
import { formFrame } from "../src/interaction/frame-presenters.ts";
import { presentFacts } from "../src/interaction/fact-presentation.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";
import { sameFact } from "../src/fact-values.ts";
import { fieldValues } from "../src/testing/values.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";

// A syntax-only schema specimen. Runtime staging/authority is tested by private-images-runtime.test.ts.
const asset = { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } as const;
const file = { id: "ephemeral-handle", name: "photo.jpg", size: 12, mediaType: "image/jpeg", lastModified: 1 };
const selection = { kind: "image-file", file } as const;

test("a file fact has one closed field contract and accepts only canonical asset reference values", () => {
  const images = fileFact({ accept: ["image/webp", "image/jpeg", "image/png"], maxBytes: 20_971_520 });
  assert.deepEqual(images, { kind: "file", accept: ["image/jpeg", "image/png", "image/webp"], maxBytes: 20_971_520 });
  assert.ok(Object.isFrozen(images) && Object.isFrozen(images.accept));
  for (const options of [{ accept: ["image/jpeg"], maxBytes: 1, url: "https://example.com/image.jpg" }, { accept: [], maxBytes: 1 },
    { accept: ["text/html"], maxBytes: 1 }, { accept: ["image/png", "image/png"], maxBytes: 1 }, { accept: ["image/png"], maxBytes: 0 },
    { accept: ["image/png"], maxBytes: 20_971_521 }, { accept: ["image/png"] }, undefined]) {
    assert.throws(() => Reflect.apply(fileFact, null, [options]), /INVALID_FILE_DEFINITION/, JSON.stringify(options));
  }
  assert.equal(validate(mutation.commandId, { title: "Photo", image: asset }), true);
  for (const image of ["https://example.com/image.jpg", "/private/image.jpg", file, selection,
    { ...asset, url: "https://example.com/image.jpg" }, { ...asset, reference: asset.reference.toUpperCase() }]) {
    assert.equal(validate(mutation.commandId, { title: "Photo", image }), false);
  }
  assert.throws(() => fieldValues(images, 0), /ASSET_INPUT_REQUIRES_STAGED_FIXTURE/);
});

test("pending file metadata is a local draft, never a fabricated accepted asset", () => {
  assert.equal(validate(mutation.commandId, { title: "Photo", image: selection }), false);
  assert.equal(inspectMutationDraft(surface, mutation, { title: "Photo", image: selection }, validate).valid, true);
  assert.equal(inspectMutationDraft(surface, mutation, { title: "", image: selection }, validate).valid, false);
  assert.equal(inspectMutationDraft(surface, mutation, { title: "Photo", image: { ...selection, file: { ...file, size: 0 } } }, validate).valid, false);
  assert.equal(inspectMutationDraft(surface, mutation, { title: "Photo", image: { ...selection, file: { ...file, mediaType: "video/mp4" } } }, validate).valid, false);
  assert.equal(inspectMutationDraft(surface, mutation, { title: "Photo", image: selection }, (id, input) => validate(id, input)).valid, false);
  const frame = formFrame(surface, mutation, { title: "Photo", image: selection }, {
    primary: toolbarAction({ kind: "journey", journey: mutation.id }, "Import image", "save", true),
  });
  assert.equal(frame.content.kind, "form");
  if (frame.content.kind !== "form") throw new Error("FORM_EXPECTED");
  assert.deepEqual(frame.content.fields.find(field => field.name === "image"), {
    name: "image", required: true, label: "Image", primitive: "control.files", files: [file], media: ["image/jpeg", "image/png", "image/webp"],
  });
  assert.doesNotThrow(() => JSON.stringify(frame));
});

test("asset image representation never renders an identifier as human text", () => {
  const facts = presentFacts(surface, "photo", ["title", "image"], { title: "Photo", image: asset });
  assert.deepEqual(facts.images, ["image"]);
  assert.equal(sameFact(asset, { ...asset }), true);
  assert.equal(sameFact(asset, { ...asset, reference: "e7000000-0000-4000-8000-000000000002" }), false);
  assert.throws(() => surfaceFrame({ version: "desert.surface-frame/6", kind: "context", top: { title: "Photo" },
    content: { ...facts, images: [] }, bottom: {} }), /./);
});

test("asset assignment and representation are canonical rules; a text view rejects an asset collection", () => {
  const change = (mutate: (definition: ProductDefinition) => void) => {
    const definition = structuredClone(Images) as ProductDefinition; mutate(definition); return () => compile(definition);
  };
  assert.throws(change(definition => {
    const journey = definition.journeys!.find(item => item.id === mutation.id)!;
    if (journey.kind !== "mutation" || journey.command.kind !== "create") throw new Error("CREATE_EXPECTED");
    journey.command.values.image = { kind: "literal", value: "untrusted" };
  }), /File assignment requires input/);
  const withImages = structuredClone(Images) as ProductDefinition;
  const read = withImages.journeys!.find(item => item.kind === "read")!;
  if (read.kind === "read") read.collection.push("image");
  const admitted = compile(withImages).surface("human");
  assert.throws(() => compileViewProgram(program, admitted), /ASSET_CANNOT_BE_COLLECTION_TEXT/);
  assert.throws(change(definition => {
    const human = definition.surfaces![0]!;
    if (human.kind === "human") human.fieldRepresentations["photo.image"] = "text";
  }), /representation/);
  assert.deepEqual(application.inputSchema(mutation.commandId).required, ["image", "title"]);
});
