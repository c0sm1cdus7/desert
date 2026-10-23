import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import { deriveForm } from "../src/interaction/form.ts";
import { presentFacts } from "../src/interaction/fact-presentation.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import { agentProjectionDefinition } from "./fixtures/agent-prepared-projection.ts";

function fixture(mode: "create" | "update") {
  const definition = agentProjectionDefinition();
  const notebook: ProductDefinition = protocolNotebookDefinition();
  const human = notebook.surfaces!.find(surface => surface.kind === "human")!;
  if (human.kind !== "human") throw new Error("Invalid fixture");
  human.journeys = ["create-note", "read-note", ...(mode === "update" ? ["edit-alias"] : [])];
  human.commit = { "create-note": "submit", ...(mode === "update" ? { "edit-alias": "submit" } : {}) };
  human.language.journeys = { "create-note": "Create", "read-note": "Read",
    ...(mode === "update" ? { "edit-alias": "Edit alias" } : {}) };
  human.language.fields = { "note.title": "Title", "note.body": "Content", "note.state": "Status" };
  human.fieldRepresentations = { "note.title": "text", "note.body": "paragraphs", "note.state": "text",
    "note.aliasTarget": "text", ...(mode === "update" ? { "note.aliasSource": "text" as const } : {}) };
  if (mode === "create") {
    const create = definition.journeys!.find(item => item.id === "create-note")!;
    if (create.kind !== "mutation" || create.command.kind !== "create") throw new Error("Invalid fixture");
    create.command.values.aliasTarget = { kind: "input", field: "title" };
  }
  definition.surfaces = [human];
  return { definition, human };
}

test("human creation with an aliased input target requires that target's published label", () => {
  const { definition } = fixture("create");
  assert.throws(() => compile(definition), /Missing field label: note.aliasTarget/);
});

test("human creation with complete alias metadata publishes the actual assigned target", () => {
  const { definition, human } = fixture("create");
  human.language.fields["note.aliasTarget"] = "Assigned value";
  const operation = compile(definition).surface("human").journeys.find(journey => journey.id === "create-note");
  assert.ok(operation?.kind === "mutation");
  assert.deepEqual(new Set(operation.responseFields), new Set(["title", "state", "body", "aliasTarget"]));
});

test("human update aliases require the input source label even when only the target is a stored effect", () => {
  const { definition, human } = fixture("update");
  human.language.fields["note.aliasTarget"] = "Assigned value";
  assert.throws(() => compile(definition), /Missing field label: note.aliasSource/);
});

test("human update accepts source and target labels without publishing the unrelated source fact", () => {
  const { definition, human } = fixture("update");
  human.language.fields["note.aliasSource"] = "New value";
  human.language.fields["note.aliasTarget"] = "Assigned value";
  const operation = compile(definition).surface("human").journeys.find(journey => journey.id === "edit-alias");
  assert.ok(operation?.kind === "mutation");
  assert.deepEqual(operation.inputFields, ["aliasSource"]);
  assert.deepEqual(operation.responseFields, ["title", "state", "aliasTarget"]);
});

test("an alias input's control and the assigned fact's reading representation remain independent", () => {
  const { definition, human } = fixture("update");
  human.language.fields["note.aliasSource"] = "New value";
  human.language.fields["note.aliasTarget"] = "Assigned value";
  human.fieldRepresentations["note.aliasTarget"] = "paragraphs";
  const surface = compile(definition).surface("human");
  assert.ok(surface.fieldRepresentations && surface.language && surface.connection && surface.commit);
  const operation = surface.journeys.find(journey => journey.id === "edit-alias");
  assert.ok(operation?.kind === "mutation");
  assert.deepEqual(deriveForm(operation, surface.fieldRepresentations).map(field => [field.name, field.primitive]),
    [["aliasSource", "input.text"]]);
  const reading = presentFacts({ ...surface, fieldRepresentations: surface.fieldRepresentations,
    language: surface.language, connection: surface.connection, commit: surface.commit },
    "note", ["aliasTarget"], { aliasTarget: "First paragraph\nSecond paragraph" });
  assert.deepEqual(reading.multiline, ["aliasTarget"]);
  assert.deepEqual(reading.facts, { aliasTarget: "First paragraph\nSecond paragraph" });
});
