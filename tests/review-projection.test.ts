import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { reviewFrame } from "../src/interaction/frame-presenters.ts";
import { Notebook } from "../products/notebook/product.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import { localProgram } from "../src/local/program.ts";
import { preparedView } from "../src/local/effects.ts";
import type { Intent, Run } from "../src/local/types.ts";

function fixture() {
  const definition: ProductDefinition = protocolNotebookDefinition();
  const human = definition.surfaces!.find(surface => surface.kind === "human")!;
  assert.equal(human.kind, "human");
  const read = definition.journeys!.find(journey => journey.kind === "read")!;
  assert.equal(read.kind, "read");
  return { definition, human, read };
}

test("semantic field representations explicitly migrate the canonical contract and interaction protocol", () => {
  const application = compile(Notebook);
  assert.equal(application.digest, "17657a0a8684597ee424c272244a39f42b2b939d7bb6eec31cf633bdccd68b83");
  assert.notEqual(application.digest, "00ec592ad3b5832fcee8464837b1c6e3120cb9b77c117bd3a2caaa68dd7d9040");
  assert.notEqual(application.digest, "e2df70817bff909c54635f9f7c4581737503e5e719cff1e4869bba6d5ced4240");
  assert.equal(application.surface("human").protocol, "desert.interaction/7");
  const legacy = { ...Notebook, surfaces: Notebook.surfaces.map(surface => {
    if (surface.kind !== "human") return surface;
    const { fieldRepresentations, ...metadata } = surface;
    return { ...metadata, inputs: { "note.body": "input.multiline" } };
  }) };
  assert.throws(() => compile(legacy), /Invalid definition/);
});

test("review exposes a changed field omitted from detail but authorized by the same surface collection", async () => {
  const { definition, read } = fixture();
  read.fields = ["title", "body"];
  const application = compile(definition);
  const surface = application.surface("human") as HumanSurface;
  const mutation = surface.journeys.find(journey => journey.id === "archive-note")!;
  assert.equal(mutation.kind, "mutation");
  const frame = reviewFrame(surface, mutation,
    { title: "Independent title", body: "Independent body", state: "archived", owner: "private-actor", privateFact: "secret" },
    { kind: "review" }, false, true);
  assert.equal(frame.content.kind, "review");
  assert.deepEqual(frame.content.details.fields, ["title", "body", "state"]);
  assert.deepEqual(frame.content.details.facts,
    { title: "Independent title", body: "Independent body", state: "archived" });
});

test("review cannot gain visibility from an agent-only read or a field label", () => {
  const { definition, human, read } = fixture();
  read.fields = ["title", "body"];
  read.collection = ["title"];
  definition.journeys!.push({ ...read, id: "agent-private-read", fields: ["state"] });
  definition.surfaces!.find(surface => surface.kind === "agent")!.journeys.push("agent-private-read");
  assert.equal(human.language.fields["note.state"], "Status");
  assert.throws(() => compile(definition), /UNSUPPORTED_REVIEW_PROJECTION.*archive-note.*state/);
});

test("human exposure rejects a principal representation at contract compilation", () => {
  const { definition, human, read } = fixture();
  read.fields.push("owner");
  human.language.fields["note.owner"] = "Owner";
  human.fieldRepresentations["note.owner"] = "text";
  human.commit["create-note"] = "review";
  assert.throws(() => compile(definition), /Field representation type mismatch: note.owner/);
});

test("agent preparation excludes ownership even when its own read explicitly publishes that field", () => {
  const { definition, read } = fixture();
  definition.journeys!.push({ ...read, id: "agent-owner-read", fields: [...read.fields, "owner"] });
  definition.surfaces!.find(surface => surface.kind === "agent")!.journeys.push("agent-owner-read");
  const program = localProgram(compile(definition), ["notes"]);
  const run: Run = { id: "run", actor: "actor", surface: "agent", journey: "create-note", subject: null,
    contract_digest: "digest", expires_at: new Date("2030-01-01"), state: "prepared" };
  const intent: Intent = { id: "intent", run_id: "run", input: { title: "Title", body: "Body" },
    effect: { kind: "create", objectType: "note", objectId: "one", expectedVersion: 0,
      facts: { title: "Title", body: "Body", state: "active", owner: "actor" } },
    confirmation_digest: "unchanged" };
  const prepared = preparedView(program, run, intent);
  assert.deepEqual(prepared.facts, { title: "Title", body: "Body", state: "active" });
  assert.equal(Object.hasOwn(prepared.facts, "owner"), false);
  assert.equal(intent.effect.facts.owner, "actor");
  assert.equal(prepared.confirmationDigest, "unchanged");
});

test("unexposed create effects cannot silently disappear from a requested review", () => {
  const { definition, human } = fixture();
  definition.objects[0]!.facts.privateFact = { kind: "text" };
  const create = definition.journeys!.find(journey => journey.id === "create-note")!;
  assert.equal(create.kind, "mutation");
  assert.equal(create.command.kind, "create");
  create.command.values.privateFact = { kind: "literal", value: "private" };
  assert.doesNotThrow(() => compile(definition), "direct submit does not invent a review obligation");
  human.commit["create-note"] = "review";
  assert.throws(() => compile(definition), /UNSUPPORTED_REVIEW_PROJECTION.*create-note.*privateFact/);
});
