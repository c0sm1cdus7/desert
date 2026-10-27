import assert from "node:assert/strict";
import test from "node:test";
import { WorkspaceView, workspaceViews } from "./fixtures/workspace-view.ts";
import { compile } from "../src/compile.ts";
import { humanExposure } from "../src/exposures.ts";
import { composeProduct } from "../src/modules/compose.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { Notebook } from "../products/notebook/product.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import type { ProductDefinition } from "../src/contracts.ts";

function candidate() {
  const definition = structuredClone(Notebook) as ProductDefinition;
  const surface = definition.surfaces!.find(surface => surface.kind === "human")!;
  assert.equal(surface.kind, "human");
  return { definition, surface };
}

test("Canonical field representations are complete, exposed, and compatible with the declared fact", () => {
  const missing = candidate();
  delete missing.surface.fieldRepresentations["note.body"];
  assert.throws(() => compile(missing.definition), /Missing field representation: note.body/);

  for (const name of ["foreign.body", "note.missing", "note.owner"]) {
    const extra = candidate();
    extra.surface.fieldRepresentations[name] = "text";
    assert.throws(() => compile(extra.definition), new RegExp(`Unknown field representation: ${name}`));
  }

  const enumeration = candidate();
  enumeration.surface.fieldRepresentations["note.state"] = "paragraphs";
  assert.throws(() => compile(enumeration.definition), /Field representation type mismatch: note.state/);

  const numeric = candidate();
  numeric.definition.objects[0]!.facts.body = { kind: "integer" };
  assert.throws(() => compile(numeric.definition), /Field representation type mismatch: note.body/);

  const principal = candidate();
  const read = principal.definition.journeys!.find(journey => journey.kind === "read")!;
  assert.equal(read.kind, "read");
  read.fields.push("owner");
  principal.surface.language.fields["note.owner"] = "Owner";
  principal.surface.fieldRepresentations["note.owner"] = "text";
  assert.throws(() => compile(principal.definition), /Field representation type mismatch: note.owner/);
});

test("Representation projections are immutable snapshots and never depend on later source mutation", () => {
  const { definition, surface } = candidate();
  const application = compile(definition);
  const projection = application.surface("human");
  assert.deepEqual(projection.fieldRepresentations, { "note.title": "text", "note.body": "paragraphs", "note.state": "text" });
  assert.ok(Object.isFrozen(projection.fieldRepresentations));
  surface.fieldRepresentations["note.body"] = "text";
  assert.equal(projection.fieldRepresentations!["note.body"], "paragraphs");
  assert.notEqual(compile(definition).digest, application.digest);
});

test("Human exposure rejects input primitive maps rather than reinterpreting them", () => {
  const declaration = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" };
  for (const inputs of [{ "note.body": "input.multiline" }, undefined, null]) {
    assert.throws(() => Reflect.apply(humanExposure, undefined, [{ ...declaration, inputs }]), /SURFACE_SEMANTICS_FORBIDDEN/);
  }
  const { definition, surface } = candidate();
  Object.assign(surface, { inputs: { "note.body": "input.multiline" } });
  assert.throws(() => compile(definition), /Invalid definition/);
});

test("Human field representations derive from object publication, never a surface map", () => {
  const source = authoredNotebookSource();
  const product = composeProduct(source);
  const human = product.definition.surfaces?.find(surface => surface.kind === "human");
  assert.ok(human?.kind === "human");
  assert.deepEqual(human.fieldRepresentations, { "note.title": "text", "note.body": "paragraphs", "note.state": "text" });
  const candidate = { ...source, exposures: source.exposures.map(surface => surface.kind === "human"
    ? { ...surface, fieldRepresentations: human.fieldRepresentations } : surface) };
  assert.throws(() => Reflect.apply(composeProduct, undefined, [candidate]), /SURFACE_SEMANTICS_FORBIDDEN/);
});

test("Field kinds are derived even for a literal mutation effect without any exposed read", () => {
  const { definition, surface } = candidate();
  definition.journeys = definition.journeys!.filter(journey => journey.id === ArchiveNote.id);
  surface.journeys = [ArchiveNote.id];
  surface.commit = { [ArchiveNote.id]: "submit" };
  surface.language = { locale: "en", fields: { "note.state": "Status" }, journeys: { [ArchiveNote.id]: "Archive note" } };
  surface.fieldRepresentations = { "note.state": "text" };
  definition.surfaces = [surface];
  const projection = compile(definition).surface("human");
  assert.deepEqual(projection.fieldKinds, { "note.state": "enum" });
  assert.equal(projection.journeys.length, 1);
  const mutation = projection.journeys[0]!;
  assert.equal(mutation.kind, "mutation");
  if (mutation.kind !== "mutation") throw new Error("MUTATION_REQUIRED");
  assert.deepEqual(mutation.inputFields, []);
  const program = {
    version: "desert.view-program/4", productId: definition.id, label: "Literal effect", workspace: WorkspaceView.id,
    views: [{ version: "desert.view/1", id: "home", outputs: [],
      content: [{ kind: "header", id: "heading", title: "Home", subtitle: "Literal effect" }] }, ...workspaceViews],
    journeys: [{ id: "home", kind: "presentation", view: "home", outputs: [] }],
    destinations: [{ id: "home", label: "Home", icon: "open", entryJourney: "home" }],
    entry: "home", navigation: [{ destination: "home", group: "Explore", purpose: "content" }],
  };
  assert.deepEqual(compileViewProgram(program, structuredClone(projection)), program);
  assert.throws(() => compileViewProgram(program, { ...projection,
    fieldRepresentations: { "note.state": "paragraphs" } }), /Field representation type mismatch: note.state/);
});

test("No authoring boundary accepts derived field kind metadata, including undefined", () => {
  for (const fieldKinds of [{ "note.body": "text" }, undefined, null]) {
    assert.throws(() => Reflect.apply(humanExposure, undefined, [{ id: "human", journeys: [ReadNote], locale: "en", fieldKinds }]),
      /SURFACE_SEMANTICS_FORBIDDEN/);
    const source = authoredNotebookSource();
    assert.throws(() => Reflect.apply(composeProduct, undefined, [{ ...source, exposures: source.exposures.map(surface =>
      surface.kind === "human" ? { ...surface, fieldKinds } : surface) }]), /SURFACE_SEMANTICS_FORBIDDEN/);
    const { definition, surface } = candidate();
    Object.assign(surface, { fieldKinds });
    assert.throws(() => compile(definition), fieldKinds === undefined ? /Expected a JSON value/ : /Invalid definition/);
  }
});
