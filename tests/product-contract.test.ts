import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";

test("a complete Notebook contract compiles, but does not claim an executor", () => {
  const application = compile(notebookDefinition());
  assert.equal(application.id, "notebook");
  assert.equal("execute" in application, false);
  assert.equal(application.executionPlan().status, "not-installed");
});

test("invalid enum defaults are rejected for their semantic reason", () => {
  const definition = notebookDefinition();
  definition.journeys[0]!.command!.values!.state.value = "published";
  assert.throws(() => compile(definition), /Invalid literal.*state/);
});

test("the owner field must be assigned from authenticated actor, not a literal", () => {
  const definition = notebookDefinition();
  Object.assign(definition.journeys[0]!.command!.values!, { owner: { kind: "literal", value: "alice" } });
  assert.throws(() => compile(definition), /Owner must come from actor/);
});

test("a surface cannot invent a journey", () => {
  const definition = notebookDefinition();
  definition.surfaces[0]!.journeys.push("delete-all-notes");
  assert.throws(() => compile(definition), /Unknown journey/);
});

test("a command cannot consume a field outside its input", () => {
  const definition = notebookDefinition();
  Object.assign(definition.journeys[0]!.command!.values!.title, { field: "state" });
  assert.throws(() => compile(definition), /Unknown input field/);
});

test("a command cannot use a missing object", () => {
  const definition = notebookDefinition();
  definition.journeys[0]!.command!.object = "invoice";
  assert.throws(() => compile(definition), /Unknown object/);
});
