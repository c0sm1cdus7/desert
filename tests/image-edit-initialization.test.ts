import assert from "node:assert/strict";
import test from "node:test";
import { controllerRole, fromInput, mutationJourney, updateCommand } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { humanProduct } from "../src/web/client/model.ts";
import { webTransport } from "../src/web/client/transport.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { Images, Photo, ReadPhotos } from "./fixtures/image-input.ts";
import { WorkspaceView, workspaceViews } from "./fixtures/workspace-view.ts";
import { until } from "./fixtures/client-edit.ts";
import { readScopes } from "../src/web/client/view-scopes.ts";
import type { ViewProgram } from "../src/views/program-schema.ts";

const ReplacePhoto = mutationJourney("replace-photo", updateCommand("replace-photo-record", Photo, {
  input: ["image"], when: {}, set: { image: fromInput("image") },
}), { controller: controllerRole({ id: "photos", objects: [Photo], requires: [] }), dependencies: [] });
const application = compile({ ...Images, journeys: [...Images.journeys, ReplacePhoto],
  surfaces: Images.surfaces.map(surface => surface.kind !== "human" ? surface : { ...surface,
    journeys: [...surface.journeys, ReplacePhoto.id],
    commit: { ...surface.commit, [ReplacePhoto.id]: "submit" as const },
    language: { ...surface.language, journeys: { ...surface.language.journeys, [ReplacePhoto.id]: "Replace image" } },
  }),
});
const surface = application.surface("human") as HumanSurface;
const candidate = {
  version: "desert.view-program/4", productId: Images.id, label: "Images", workspace: WorkspaceView.id,
  views: [
    { version: "desert.view/1", id: "photos", outputs: ["select"], content: [
      { kind: "header", id: "header", title: "Images" }, { kind: "collection", id: "photos", input: "records", output: "select" }] },
    { version: "desert.view/1", id: "photo", outputs: ["close"], content: [
      { kind: "header", id: "header", title: { kind: "subject-title" } }, { kind: "context", id: "photo", input: "detail" }],
      topDock: { kind: "toolbar", actions: [{ output: "close", label: "Close", icon: "close" }] } },
    { version: "desert.view/1", id: "edit", outputs: ["save", "close"], content: [
      { kind: "header", id: "header", title: { kind: "operation-label" } }, { kind: "form", id: "form", input: "draft" }],
      topDock: { kind: "toolbar", actions: [{ output: "close", label: "Close", icon: "close" }] },
      bottomDock: { kind: "toolbar", actions: [{ output: "save", label: "Save", icon: "save" }] } },
    ...workspaceViews,
  ],
  journeys: [
    { id: ReadPhotos.id, kind: "read", view: "photos", detailView: "photo", outputs: [
      { view: "photos", output: "select", action: { kind: "select" } }, { view: "photo", output: "close", action: { kind: "close" } }] },
    { id: ReplacePhoto.id, kind: "update", source: ReadPhotos.id, view: "edit", preferredDock: "right",
      initialize: [{ input: "image", fact: "image" }], outputs: [
        { view: "edit", output: "save", action: { kind: "submit" } }, { view: "edit", output: "close", action: { kind: "close" } }] },
  ],
  objects: [{ object: Photo.id, view: "photo", title: { object: Photo.id, field: "title" },
    actions: [{ journey: ReplacePhoto.id, icon: "edit" }] }],
  destinations: [{ id: "photos", label: "Images", icon: "media", entryJourney: ReadPhotos.id }],
  entry: "photos", navigation: [{ destination: "photos", group: "Explore", purpose: "content" }],
} as const satisfies ViewProgram;

test("an attached image cannot initialize a new mutation's staged image input", () => {
  assert.throws(() => compileViewProgram(candidate, surface), /INVALID_VIEW_INITIALIZATION/);
});

test("the private model also refuses asset initialization instead of showing an empty file control with a valid draft", async t => {
  // Transport-only fixture. This reference is a shape specimen, not a staged asset or authority.
  const record = { id: "photo", version: 1, facts: { title: "Photo",
    image: { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } } };
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const operation = url.split("/").at(-1)!; calls.push(operation);
    const result = operation === "availability" ? { snapshot: { contractDigest: surface.contractDigest,
      journeys: Object.fromEntries(surface.journeys.map(journey => [journey.id, { dependenciesReady: true, blockers: [] }])) }, validForMs: 1000 }
      : operation === "begin" ? { id: "read-run" } : operation === "read" ? [record]
      : operation === "offer" ? { journeyId: ReplacePhoto.id, subject: record.id, version: 1, eligible: true } : undefined;
    if (result === undefined) throw new Error(`Unexpected ${operation}`);
    return new Response(JSON.stringify(result));
  });
  const model = humanProduct(surface, (id, input) => application.validateInput(id, input).valid, {
    scope: readScopes(candidate, surface).find(scope => scope.read.id === ReadPhotos.id)!,
    transport: webTransport(surface.contractDigest, { kind: "developer" }),
    initialize: { [ReplacePhoto.id]: [{ input: "image", fact: "image" }] },
  });
  t.after(() => model.dispose());
  await model.start(); await until(() => model.snapshot().loaded); await model.select(record.id);
  const before = structuredClone(model.snapshot().draft);
  assert.equal(model.startEdit(ReplacePhoto.id), false);
  assert.equal(model.snapshot().view, "detail");
  assert.deepEqual(model.snapshot().draft, before);
  assert.equal(calls.some(operation => ["reserveImage", "prepare", "accept"].includes(operation)), false);
});
