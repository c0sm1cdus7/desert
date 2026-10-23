import test from "node:test";
import assert from "node:assert/strict";
import * as sdk from "../src/index.ts";
import { Note } from "../products/notebook/note.ts";
import { ArchiveNote, CreateNote } from "../products/notebook/journeys.ts";
import { program } from "./fixtures/view-program.ts";

test("Typed ports declare names once and outputs retain their exact View reference", () => {
  const ports = sdk.viewPorts({ inputs: { notes: "collection", note: "context" }, outputs: ["create", "select", "close"] });
  assert.deepEqual(ports, {
    inputs: { notes: { kind: "collection", input: "notes" }, note: { kind: "context", input: "note" } },
    outputs: ["create", "select", "close"], output: { create: "create", select: "select", close: "close" },
  });
  assert.ok(Object.isFrozen(ports.inputs.notes));
  const output = sdk.viewOutput(program.views[1], "create");
  assert.deepEqual(output, { view: program.views[1], output: "create" });
  assert.equal(output.view, program.views[1]);
  assert.throws(() => sdk.viewOutput(program.views[1], "missing" as never), { message: "UNKNOWN_VIEW_OUTPUT_REFERENCE" });
  assert.throws(() => sdk.viewPorts({ inputs: {}, outputs: ["create", "create"] }), { message: "INVALID_VIEW_PORTS" });
  assert.throws(() => sdk.viewPorts({ inputs: {}, outputs: [], style: "custom" } as never), { message: "INVALID_VIEW_PORTS" });
  assert.deepEqual(sdk.viewPorts({ inputs: { draft: "form" }, outputs: ["save"] }).inputs.draft,
    { kind: "form", input: "draft" });
  assert.throws(() => sdk.viewPorts({ inputs: { picture: "image" }, outputs: [] } as never), { message: "INVALID_VIEW_PORTS" });
});

test("Fact and initializer helpers resolve real object and command references", () => {
  const title = sdk.factReference(Note, "title");
  assert.deepEqual(title, { object: "note", field: "title" });
  assert.deepEqual(sdk.initializeInput(CreateNote.command, "title", title), { input: "title", fact: "title" });
  assert.throws(() => sdk.factReference(Note, "missing" as never), { message: "UNKNOWN_FACT_REFERENCE" });
  assert.throws(() => sdk.initializeInput(CreateNote.command, "missing" as never, title), { message: "UNKNOWN_COMMAND_INPUT_REFERENCE" });
  assert.throws(() => sdk.initializeInput(CreateNote.command, "title", { object: "other", field: "title" } as never),
    { message: "FOREIGN_INITIALIZER_FACT" });
});

test("An object publication retains definitions until composition admits and lowers their references", () => {
  const published = sdk.publishObject(Note, { view: program.views[2], title: sdk.factReference(Note, "title"), actions: [{ journey: ArchiveNote, icon: "close" }] });
  assert.deepEqual(published, { ...Note, presentation: { view: program.views[2], title: { object: "note", field: "title" }, actions: [{ journey: ArchiveNote, icon: "close" }] } });
  assert.equal(published.presentation.view, program.views[2]);
  assert.equal(published.presentation.actions[0].journey, ArchiveNote);
  assert.ok(Object.isFrozen(published));
  assert.equal(Object.hasOwn(Note, "presentation"), false);
  const mutable = structuredClone(Note);
  const snapshot = sdk.publishObject(mutable, { view: program.views[2], title: sdk.factReference(mutable, "title"), actions: [] });
  assert.notEqual(snapshot.facts, mutable.facts);
  assert.equal(Object.isFrozen(mutable.facts), false, "Publication cannot freeze a caller's domain object");
  assert.throws(() => sdk.publishObject(Note, { view: program.views[2], title: sdk.factReference(Note, "title"), actions: [{ journey: CreateNote, icon: "create" }] } as never),
    { message: "INVALID_OBJECT_SUBJECT_JOURNEY" });
  assert.throws(() => sdk.publishObject(Note, { view: program.views[2], title: sdk.factReference(Note, "title"), actions: [], style: "custom" } as never),
    { message: "INVALID_OBJECT_PUBLICATION" });
  assert.throws(() => sdk.publishObject(Note, { view: program.views[2], title: sdk.factReference(Note, "title"),
    actions: [{ journey: ArchiveNote, icon: "archive" }, { journey: ArchiveNote, icon: "close" }] }),
  { message: "DUPLICATE_OBJECT_JOURNEY" });
});
