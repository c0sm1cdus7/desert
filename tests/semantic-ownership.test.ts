import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct, humanExposure, publishObject } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Note } from "../products/notebook/note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { ViewNotebook } from "./fixtures/view-exposure.ts";
import { authoredNotebookSource, notePublication } from "./fixtures/authored-notebook.ts";
import { FixtureMessages } from "./fixtures/messages.ts";

test("A composed human exposure names journeys and locale without duplicating their semantics", () => {
  const exposure = humanExposure({ id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" });
  assert.deepEqual(exposure, { id: "human", kind: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" });
  assert.equal(exposure.journeys[0], CreateNote, "Admission needs the exact authored journey object");
  assert.ok(Object.isFrozen(exposure));
});

test("Owned labels, field representations and review choices lower to the same explicitly migrated canonical contract", () => {
  const result = composeProduct(authoredNotebookSource());
  assert.deepEqual(result.definition, ViewNotebook);
  const before = compile(ViewNotebook), after = compile(result.definition);
  assert.equal(after.digest, before.digest);
  assert.deepEqual(after.surface("human"), before.surface("human"));
  assert.deepEqual(after.surface("agent"), before.surface("agent"));
  assert.equal(result.viewProgram.objects?.some(object => Object.hasOwn(object, "fields")), false);
});

test("Root maps are forbidden even when they exactly repeat derived metadata", () => {
  const old = ViewNotebook.surfaces.find(surface => surface.kind === "human")!;
  for (const [key, map] of [["inputs", { "note.body": "input.multiline" }],
    ["fieldRepresentations", old.fieldRepresentations], ["commit", old.commit], ["language", old.language]] as const) {
    for (const value of [map, undefined, null]) {
      const variable = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en", [key]: value };
      assert.throws(() => humanExposure(variable as never), /SURFACE_SEMANTICS_FORBIDDEN/);
    }
    const source = authoredNotebookSource();
    const raw = { ...source, exposures: source.exposures.map(surface =>
      surface.kind === "human" ? { ...surface, [key]: JSON.parse(JSON.stringify(map)) } : surface) };
    assert.throws(() => composeProduct(raw as never), /SURFACE_SEMANTICS_FORBIDDEN/);
  }
});

test("Field metadata cannot target another object, duplicate a fact, or invent a representation", () => {
  const title = notePublication.fields[0];
  for (const [fields, message] of [
    [[title, title], "DUPLICATE_PRESENTED_FACT"],
    [[{ ...title, fact: { object: "another-object", field: "title" } }], "FOREIGN_PRESENTED_FACT"],
    [[{ ...title, fact: { object: Note.id, field: "unknown" } }], "UNKNOWN_PRESENTED_FACT"],
    [[{ ...notePublication.fields[2], representation: "paragraphs" }], "INVALID_FACT_REPRESENTATION"],
  ] as const) {
    assert.throws(() => publishObject(Note, { ...notePublication, fields } as never), { message });
  }
});

test("Every exposed field, operation label and mutation review choice needs one explicit owner", () => {
  const source = authoredNotebookSource();
  const missingBody = publishObject(Note, { ...notePublication,
    fields: [notePublication.fields[0], notePublication.fields[2]] });
  assert.throws(() => composeProduct({ ...source, objects: [missingBody] }), /FIELD_PRESENTATION_REQUIRED/);
  const missingLabel = source.journeys.map(registration => {
    if (!("execution" in registration) || registration.execution.id !== ReadNote.id) return registration;
    const { label, ...withoutLabel } = registration;
    return withoutLabel;
  });
  assert.throws(() => composeProduct({ ...source, journeys: missingLabel }), /JOURNEY_LABEL_REQUIRED/);
  const missingReview = source.journeys.map(registration => {
    if (!("humanReview" in registration) || registration.execution.id !== CreateNote.id) return registration;
    const { humanReview, ...withoutReview } = registration;
    return withoutReview;
  });
  assert.throws(() => composeProduct({ ...source, journeys: missingReview }), /HUMAN_REVIEW_REQUIRED/);
});

test("Human review does not replace prepared effects, atomic acceptance, or receipt outcomes", () => {
  const source = authoredNotebookSource();
  const ordinary = composeProduct(source);
  const reviewed = composeProduct({ ...source, journeys: source.journeys.map(registration =>
    "humanReview" in registration && registration.execution.id === CreateNote.id
      ? { ...registration, humanReview: "required" as const } : registration) });
  const ordinarySurface = compile(ordinary.definition).surface("human");
  const reviewedSurface = compile(reviewed.definition).surface("human");
  assert.equal(ordinarySurface.commit?.[CreateNote.id], "submit");
  assert.equal(reviewedSurface.commit?.[CreateNote.id], "review");
  assert.deepEqual(reviewed.definition.journeys, ordinary.definition.journeys);
  for (const surface of [ordinarySurface, reviewedSurface]) {
    const mutation = surface.journeys.find(journey => journey.id === CreateNote.id);
    assert.equal(mutation?.kind, "mutation");
    if (mutation?.kind !== "mutation") throw new Error("Missing canonical creation operation");
    assert.equal(mutation.confirmation, "prepared-effect");
    assert.equal(mutation.outcome, "receipt");
  }
});
