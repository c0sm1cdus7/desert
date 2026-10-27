import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { localProgram } from "../src/local/program.ts";
import { testInstallation } from "../src/testing/installation.ts";
import { preparedView } from "../src/local/effects.ts";
import { agentProjectionDefinition, preparedIntent, preparedRun } from "./fixtures/agent-prepared-projection.ts";

const fixture = () => localProgram(compile(agentProjectionDefinition()), ["notes"], testInstallation);

test("agent create response admits own read facts and this operation's input, never other-surface or sibling fields", () => {
  const program = fixture(), intent = preparedIntent(), original = structuredClone(intent);
  const response = preparedView(program, preparedRun("create-note"), intent);
  assert.deepEqual(response.facts, { title: "Public title", body: "Supplied body", state: "active" });
  assert.equal(response.confirmationDigest, intent.confirmation_digest);
  assert.ok(Object.isFrozen(response) && Object.isFrozen(response.facts));
  assert.deepEqual(intent, original);
});

test("agent input-free update cannot inherit the sibling create operation's input visibility", () => {
  const program = fixture(), intent = preparedIntent();
  intent.input = {};
  intent.effect.kind = "update";
  intent.effect.expectedVersion = 1;
  intent.effect.facts.state = "archived";
  assert.deepEqual(preparedView(program, preparedRun("archive-note"), intent).facts,
    { title: "Public title", state: "archived" });
});

test("agent aliased input exposes its assigned target, not an unrelated stored fact named like that input", () => {
  const program = fixture(), intent = preparedIntent();
  intent.input = { aliasSource: "Supplied alias" };
  intent.effect.kind = "update";
  intent.effect.expectedVersion = 1;
  intent.effect.facts.aliasTarget = "Supplied alias";
  assert.deepEqual(preparedView(program, preparedRun("edit-alias"), intent).facts,
    { title: "Public title", state: "active", aliasTarget: "Supplied alias" });
  assert.equal(intent.effect.facts.aliasSource, "test-only-secret:aliasSource");
});

test("an agent mutation without exposed reads or inputs has an explicitly empty response projection", () => {
  const definition = agentProjectionDefinition();
  const create = definition.journeys!.find(item => item.id === "create-note")!;
  if (create.kind !== "mutation" || create.command.kind !== "create") throw new Error("Invalid fixture");
  create.command.input = [];
  create.command.values.title = { kind: "literal", value: "Public title" };
  create.command.values.body = { kind: "literal", value: "Supplied body" };
  definition.surfaces = [{ id: "agent", kind: "agent", journeys: ["create-note"] }];
  const program = localProgram(compile(definition), ["notes"], testInstallation), intent = preparedIntent();
  intent.input = {};
  const response = preparedView(program, preparedRun("create-note"), intent);
  assert.deepEqual(response.facts, {});
  assert.equal(response.confirmationDigest, intent.confirmation_digest);
});

test("agent preparation fails closed when its compiled response authority is absent", () => {
  const program = fixture(), surface = program.application.surface("agent");
  const withoutProjection = { ...surface, journeys: surface.journeys.map(item =>
    Object.fromEntries(Object.entries(item).filter(([key]) => key !== "responseFields"))) };
  const malformed = { ...program, application: { ...program.application,
    surface: () => withoutProjection as unknown as typeof surface } };
  assert.throws(() => preparedView(malformed, preparedRun("create-note"), preparedIntent()), /INVALID_PREPARED_PROJECTION/);
});

test("an old interaction protocol cannot be treated as current response authority", () => {
  const program = fixture(), surface = program.application.surface("agent");
  const legacy = { ...surface, protocol: "desert.interaction/6" };
  const malformed = { ...program, application: { ...program.application,
    surface: () => legacy as unknown as typeof surface } };
  assert.throws(() => preparedView(malformed, preparedRun("create-note"), preparedIntent()), /INVALID_PREPARED_PROJECTION/);
});

test("agent preparation rejects incompatible operation and object authority", () => {
  const program = fixture(), intent = preparedIntent();
  for (const journey of ["missing", "read-note"]) {
    assert.throws(() => preparedView(program, preparedRun(journey), intent), /INVALID_PREPARED_PROJECTION/);
  }
  assert.throws(() => preparedView(program, preparedRun("create-note"), {
    ...intent, effect: { ...intent.effect, objectType: "another-object" },
  }), /INVALID_PREPARED_PROJECTION/);
});
