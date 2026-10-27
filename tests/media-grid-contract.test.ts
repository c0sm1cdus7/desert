import test from "node:test";
import assert from "node:assert/strict";
import { Components, defineView, factReference, viewPorts } from "../src/index.ts";
import { resolvedNode, ResolvedNodeVersion } from "../src/interaction/resolved-node.ts";
import { Photo, program as imageProgram, surface as imageSurface } from "./fixtures/image-input.ts";
import { program as labelsProgram, surface as labelsSurface } from './fixtures/labels.ts';
import { compileViewProgram } from '../src/views/program.ts';

test("private image collections explicitly author their media grid and reference its image fact", () => {
  const ports = viewPorts({ inputs: { media: "collection" }, outputs: ["select"] });
  const view = defineView({ name: "media-grid", outputs: ports.outputs, content: [Components.Collection({
    input: ports.inputs.media, output: ports.output.select,
    presentation: { kind: "media-grid", image: factReference(Photo, "image") },
  })] });
  assert.deepEqual(view.content[0]?.presentation, { kind: "media-grid", image: { object: "photo", field: "image" } });
});

test("a grid cannot expose an image outside its published collection fields", () => {
  const node = { version: ResolvedNodeVersion, kind: "collection", object: "photo", fields: ["title"],
    labels: { "photo.title": "Title" }, records: [], loaded: true, disabled: false, selectedId: null,
    presentation: { kind: "media-grid", image: "image" } };
  assert.throws(() => resolvedNode(node), /INVALID_BANK_COLLECTION/);
  assert.equal(resolvedNode({ ...node, fields: ["title", "image"], labels: { ...node.labels, "photo.image": "Image" } }).kind, "collection");
});

test('collection read data never silently becomes asset or reference text in a plain row',()=>{
  const images={...imageSurface,journeys:imageSurface.journeys.map(journey=>journey.kind==='read'?{...journey,collection:['image']}:journey)};
  assert.throws(()=>compileViewProgram(imageProgram,images),/ASSET_CANNOT_BE_COLLECTION_TEXT/);
  const labels={...labelsSurface,journeys:labelsSurface.journeys.map(journey=>journey.kind==='read'?{...journey,collection:['projects']}:journey)};
  assert.throws(()=>compileViewProgram(labelsProgram,labels),/LABELS_CANNOT_BE_COLLECTION_TEXT/);
});

test("media reading declares its visible fields and does not promote storage metadata into content", () => {
  const ports = viewPorts({ inputs: { media: "context" }, outputs: [] });
  const view = defineView({ name: "image-reading", content: [Components.Context({ input: ports.inputs.media,
    fields: [factReference(Photo, "image")], presentation: { kind: "media-object", media: factReference(Photo, "image") },
  })] });
  assert.deepEqual(view.content[0]?.fields, [{ object: "photo", field: "image" }]);
  assert.equal(view.content[0]?.presentation?.kind, "media-object");
});

test("collection cards use declared titles and bounded authorized previews, never arbitrary facts", () => {
  const value = { version: ResolvedNodeVersion, kind: "collection", object: "album", fields: ["name"], labels: { "album.name": "Name" },
    records: [{ id: "a", version: 1, facts: { name: "Travel" } }], loaded: true, disabled: false, selectedId: null,
    presentation: { kind: "collection-grid", title: "name", previews: [{ id: "a", count: 2 }] } };
  assert.equal(resolvedNode(value).kind, "collection");
  assert.throws(() => resolvedNode({ ...value, presentation: { ...value.presentation, previews: [{ id: "foreign", count: 2 }] } }), /INVALID_BANK_COLLECTION/);
  assert.throws(() => resolvedNode({ ...value, presentation: { ...value.presentation, title: "secret" } }), /INVALID_BANK_COLLECTION/);
});
