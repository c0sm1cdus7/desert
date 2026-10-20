import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { createShapeValidator } from "../src/client.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";

test("compiled command input validation consumes a schema derived from Note", () => {
  const app = compile(notebookDefinition());
  assert.equal(app.validateInput("create-note-record", { title: "Idea", body: "Text" }).valid, true);
  for (const value of [{}, { title: "Idea", body: 42 }, { title: "Idea", body: "Text", owner: "bob" }]) {
    assert.equal(app.validateInput("create-note-record", value).valid, false);
  }
  assert.equal(app.validateInput("archive-note-record", {}).valid, true);
  assert.equal(app.validateInput("archive-note-record", { state: "active" }).valid, false);
});

test("changing source contracts cannot mutate compiled effects, guards or surface metadata", () => {
  const source = notebookDefinition();
  const app = compile(source);
  const before = JSON.stringify(app.executionPlan());
  source.journeys[2]!.command!.when!.state = "archived";
  source.surfaces[0]!.language!.journeys["read-note"] = "Changed";
  assert.equal(JSON.stringify(app.executionPlan()), before);
  assert.equal(app.surface("human").language!.journeys["read-note"], "Read notes");
  assert.throws(() => Object.defineProperty(app.surface("human").journeys, "0", { value: {} }));
});

test("human and agent projections reference identical command schemas without leaking policies", () => {
  const app = compile(notebookDefinition());
  const human = app.surface("human");
  const agent = app.surface("agent");
  const humanCreate = human.journeys.find(journey => journey.id === "create-note")!;
  const agentCreate = agent.journeys.find(journey => journey.id === "create-note")!;
  assert.equal(humanCreate.kind, "mutation");
  if (humanCreate.kind !== "mutation" || agentCreate.kind !== "mutation") throw new Error("Expected mutation");
  const { reviewFields, ...sharedMeaning } = humanCreate;
  assert.deepEqual(sharedMeaning, agentCreate);
  assert.deepEqual(reviewFields, ["title", "body", "state"]);
  assert.equal("reviewFields" in agentCreate, false);
  const validate = createShapeValidator(humanCreate.inputSchema);
  assert.equal(validate({ title: "Idea", body: "Text" }).valid, true);
  assert.equal(validate({ title: "Idea", body: "Text", owner: "bob" }).valid, false);
  assert.equal(JSON.stringify(human).includes('"policies"'), false);
  assert.equal(JSON.stringify(human).includes('"values"'), false);
  // v0.4 catalog metadata names the renderer fixture owner; it is not the
  // private domain ownership fact. That fact must remain absent from projection.
  const { catalog, ...domainProjection } = human;
  assert.equal(JSON.stringify(domainProjection).includes('"owner"'), false);
  assert.ok(catalog, 'human projection includes canonical interaction catalog metadata');
  assert.ok(catalog.entries.every(entry => entry.inspection.fixtures.every(fixture =>
    fixture.owner === 'bank' || fixture.owner === 'control-bank')));
  assert.equal(Object.isFrozen(humanCreate.inputSchema), true);
  assert.equal("execute" in human, false);
});

test("changing one field updates controller and surface validation without a second schema", () => {
  const source = notebookDefinition();
  const before = compile(source);
  source.objects[0]!.facts.title.minLength = 8;
  const after = compile(source);
  const input = { title: "Idea", body: "Text" };
  assert.equal(before.validateInput("create-note-record", input).valid, true);
  assert.equal(after.validateInput("create-note-record", input).valid, false);
  const journey = after.surface("human").journeys.find(journey => journey.id === "create-note")!;
  if (journey.kind !== "mutation") throw new Error("Expected mutation");
  assert.equal(createShapeValidator(journey.inputSchema)(input).valid, false);
  assert.notEqual(before.digest, after.digest);
});
