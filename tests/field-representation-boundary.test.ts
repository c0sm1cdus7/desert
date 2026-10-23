import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct, compileViewProgram } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { deriveForm } from "../src/interaction/form.ts";
import { presentFacts } from "../src/interaction/fact-presentation.ts";
import type { FieldRepresentation } from "../src/field-representation.ts";
import type { Surface } from "../src/web/types.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";

function fixture() {
  const product = composeProduct(authoredNotebookSource());
  const surface = compile(product.definition).surface("human");
  assert.ok(surface.language && surface.commit && surface.connection && surface.fieldRepresentations);
  return { product, surface: { ...surface, language: surface.language, commit: surface.commit,
    connection: surface.connection, fieldRepresentations: surface.fieldRepresentations } };
}

const expectedFieldKinds = { "note.title": "text", "note.body": "text", "note.state": "enum" } as const;

test("View program admission rejects absent or malformed field representations before rendering", () => {
  const { product, surface } = fixture();
  const { fieldRepresentations, ...withoutRepresentations } = surface;
  assert.throws(() => compileViewProgram(product.viewProgram, withoutRepresentations as Surface),
    /INVALID_FIELD_REPRESENTATIONS/);
  for (const value of [undefined, null, [], { ...fieldRepresentations, "note.body": "custom" }]) {
    const malformed = { ...surface, fieldRepresentations: value } as unknown as Surface;
    assert.throws(() => compileViewProgram(product.viewProgram, malformed), /INVALID_FIELD_REPRESENTATIONS/);
  }
});

test("View program admission requires the exact published field representation set", () => {
  const { product, surface } = fixture();
  const { "note.body": body, ...withoutBody } = surface.fieldRepresentations;
  assert.equal(body, "paragraphs");
  for (const value of [{}, withoutBody]) {
    assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldRepresentations: value }),
      /Missing field representation: note\.(title|body)/);
  }
  const extra = { ...surface.fieldRepresentations, "note.privateFact": "text" as const };
  assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldRepresentations: extra }),
    /Unknown field representation: note.privateFact/);
});

test("Canonical field representation validation rejects paragraphs for an enum fact", () => {
  const { product } = fixture();
  const definition = { ...product.definition, surfaces: product.definition.surfaces?.map(surface =>
    surface.kind === "human" ? { ...surface,
      fieldRepresentations: { ...surface.fieldRepresentations, "note.state": "paragraphs" } } : surface) };
  assert.throws(() => compile(definition), /Field representation type mismatch: note.state/);
});

test("Compiled view program admission does not accept forged enum paragraphs", () => {
  const { product, surface } = fixture();
  const fieldRepresentations = { ...surface.fieldRepresentations, "note.state": "paragraphs" as const };
  assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldRepresentations }),
    /Field representation type mismatch: note.state/);
});

test("View program admission rejects absent or invented derived field kinds", () => {
  const { product, surface } = fixture();
  const withoutKinds = Object.fromEntries(Object.entries(surface).filter(([name]) => name !== "fieldKinds"));
  assert.throws(() => compileViewProgram(product.viewProgram, withoutKinds as Surface), /INVALID_FIELD_KINDS/);
  for (const fieldKinds of [undefined, null, [], { ...expectedFieldKinds, "note.title": "custom" }]) {
    assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldKinds } as unknown as Surface),
      /INVALID_FIELD_KINDS/);
  }
});

test("Derived field kinds must describe exactly the published fields", () => {
  const { product, surface } = fixture();
  const { "note.body": body, ...withoutBody } = expectedFieldKinds;
  assert.equal(body, "text");
  for (const fieldKinds of [{}, withoutBody]) {
    assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldKinds } as unknown as Surface),
      /Missing field kind: note\.(title|body)/);
  }
  const fieldKinds = { ...expectedFieldKinds, "note.privateFact": "text" };
  assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldKinds } as unknown as Surface),
    /Unknown field kind: note.privateFact/);
});

test("A compiled field kind cannot present a principal through the ordinary text representation", () => {
  const { product, surface } = fixture();
  const fieldKinds = { ...expectedFieldKinds, "note.title": "principal" };
  assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, fieldKinds } as unknown as Surface),
    /Field representation type mismatch: note.title/);
});

test("Derived kinds are frozen output metadata, while valid serialized surfaces remain admissible", () => {
  const { product, surface } = fixture();
  assert.ok("fieldKinds" in surface);
  assert.deepEqual(surface.fieldKinds, expectedFieldKinds);
  assert.ok(Object.isFrozen(surface.fieldKinds));
  assert.deepEqual(compileViewProgram(structuredClone(product.viewProgram), structuredClone(surface)), product.viewProgram);
  const authored = { ...product.definition, surfaces: product.definition.surfaces?.map(item =>
    item.kind === "human" ? { ...item, fieldKinds: expectedFieldKinds } : item) };
  assert.throws(() => compile(authored), /Invalid definition: unsupported or malformed contract/);
});

test("Reading and input construction both reject missing or invented representations", () => {
  const { surface } = fixture();
  const create = surface.journeys.find(journey => journey.id === "create-note");
  assert.ok(create?.kind === "mutation");
  const { "note.body": body, ...withoutBody } = surface.fieldRepresentations;
  assert.equal(body, "paragraphs");
  for (const representations of [withoutBody, { ...surface.fieldRepresentations, "note.body": "custom" }]) {
    const malformed = representations as unknown as Record<string, FieldRepresentation>;
    assert.throws(() => presentFacts({ ...surface, fieldRepresentations: malformed }, "note", ["body"],
      { body: "First paragraph\nSecond paragraph" }), /INVALID_FIELD_REPRESENTATION: note.body/);
    assert.throws(() => deriveForm(create, malformed), /INVALID_FIELD_REPRESENTATION: note.body/);
  }
  assert.deepEqual(presentFacts(surface, "note", ["body"], { body: "First\nSecond" }).multiline, ["body"]);
  assert.equal(deriveForm(create, surface.fieldRepresentations).find(field => field.name === "body")?.primitive,
    "input.multiline");
});

test("Compiled representations and programs are immutable snapshots, not aliases of authored data", () => {
  const { product, surface } = fixture();
  const fieldRepresentations = { ...surface.fieldRepresentations };
  const definition = { ...product.definition, surfaces: product.definition.surfaces?.map(surface =>
    surface.kind === "human" ? { ...surface, fieldRepresentations } : surface) };
  const application = compile(definition);
  fieldRepresentations["note.body"] = "text";
  const compiledSurface = application.surface("human");
  assert.equal(compiledSurface.fieldRepresentations?.["note.body"], "paragraphs");
  assert.ok(Object.isFrozen(compiledSurface.fieldRepresentations));
  assert.equal(Reflect.set(compiledSurface.fieldRepresentations!, "note.body", "text"), false);
  assert.equal(compiledSurface.fieldRepresentations?.["note.body"], "paragraphs");
  const authoredProgram = { ...structuredClone(product.viewProgram) };
  const program = compileViewProgram(authoredProgram, surface);
  authoredProgram.label = "Changed after admission";
  assert.equal(program.label, "Notebook");
  assert.ok(Object.isFrozen(program) && Object.isFrozen(program.views));
});

test("View program admission accepts only the exact interaction protocol and declared metadata", () => {
  const { product, surface } = fixture();
  for (const protocol of [undefined, "desert.interaction/6", "desert.interaction/8"]) {
    assert.throws(() => compileViewProgram(product.viewProgram, { ...surface, protocol } as Surface),
      /INVALID_VIEW_PROGRAM_SURFACE/);
  }
  assert.throws(() => compileViewProgram({ ...product.viewProgram, fieldRepresentations: surface.fieldRepresentations }, surface),
    /INVALID_VIEW_PROGRAM/);
  assert.deepEqual(compileViewProgram(product.viewProgram, surface), product.viewProgram);
});
