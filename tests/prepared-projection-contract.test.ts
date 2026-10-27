import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import { localProgram } from "../src/local/program.ts";
import { testInstallation } from "../src/testing/installation.ts";
import { preparedView } from "../src/local/effects.ts";
import type { Intent, Run } from "../src/local/types.ts";

function fixture() {
  const definition: ProductDefinition = protocolNotebookDefinition();
  const read = definition.journeys!.find(item => item.id === "read-note")!;
  assert.equal(read.kind, "read");
  if (read.kind !== "read") throw new Error("Expected read journey");
  read.fields = ["title", "state"];
  definition.objects[0]!.facts.privateFact = { kind: "text" };
  const creation = definition.journeys!.find(item => item.id === "create-note")!;
  if (creation.kind !== "mutation" || creation.command.kind !== "create") throw new Error("Expected create journey");
  creation.command.values.privateFact = { kind: "literal", value: "private" };
  const application = compile(definition);
  return localProgram(application, ["notes"], testInstallation);
}
const run = (journey: string, surface = "human"): Run => ({ id: "run", actor: "identity", surface, journey,
  subject: null, contract_digest: "digest", expires_at: new Date("2030-01-01"), state: "prepared" });
const intent: Intent = { id: "intent", run_id: "run", input: { title: "Title", body: "Body" },
  effect: { kind: "create", objectType: "note", objectId: "one", expectedVersion: 0,
    facts: { title: "Title", body: "Body", state: "active", owner: "identity", privateFact: "private" } },
  confirmation_digest: "original-confirmation" };

test("preparation uses this mutation's compiled responseFields, not a wider sibling projection", () => {
  const program = fixture(), original = structuredClone(intent);
  const created = preparedView(program, run("create-note"), intent);
  const archived = preparedView(program, run("archive-note"), { ...intent,
    effect: { ...intent.effect, kind: "update", expectedVersion: 1, facts: { ...intent.effect.facts, state: "archived" } } });
  assert.deepEqual(created.facts, { title: "Title", body: "Body", state: "active" });
  assert.deepEqual(archived.facts, { title: "Title", state: "archived" });
  assert.equal(created.confirmationDigest, intent.confirmation_digest);
  assert.equal(archived.confirmationDigest, intent.confirmation_digest);
  assert.deepEqual(intent, original, "projection never rewrites a persisted effect or input");
  assert.ok(Object.isFrozen(created) && Object.isFrozen(created.facts));
  assert.deepEqual(preparedView(program, run("create-note", "agent"), intent).facts,
    { title: "Title", body: "Body", state: "active" });
});

test("malformed human projection authority fails closed rather than falling back to all facts", () => {
  const program = fixture();
  for (const journey of ["missing", "read-note"]) {
    assert.throws(() => preparedView(program, run(journey), intent), /INVALID_PREPARED_PROJECTION/);
  }
  assert.throws(() => preparedView(program, run("create-note"), {
    ...intent, effect: { ...intent.effect, objectType: "different-object" },
  }), /INVALID_PREPARED_PROJECTION/);
  const human = program.application.surface("human");
  const withoutProjection = { ...human, journeys: human.journeys.map(item => {
    if (item.kind !== "mutation" || item.id !== "create-note") return item;
    const { responseFields, ...rest } = item;
    return rest;
  }) };
  const malformed = { ...program, application: { ...program.application, surface: () => withoutProjection as typeof human } };
  assert.throws(() => preparedView(malformed, run("create-note"), intent), /INVALID_PREPARED_PROJECTION/);
});
