import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { reviewFrame } from "../src/interaction/frame-presenters.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { Notebook } from "../products/notebook/product.ts";

function fixture() {
  const definition: ProductDefinition = structuredClone(Notebook);
  const human = definition.surfaces!.find(surface => surface.kind === "human")!;
  assert.equal(human.kind, "human");
  const read = definition.journeys!.find(journey => journey.kind === "read")!;
  assert.equal(read.kind, "read");
  return { definition, human, read };
}

test("review projection changes the interaction protocol, not the unchanged installation digest", () => {
  const application = compile(Notebook);
  assert.equal(application.digest, "e2df70817bff909c54635f9f7c4581737503e5e719cff1e4869bba6d5ced4240");
  assert.equal(application.surface("human").protocol, "desert.interaction/6");
});

test("review exposes a changed field omitted from detail but authorized by the same surface collection", async () => {
  const { definition, read } = fixture();
  read.fields = ["title", "body"];
  const application = compile(definition);
  await buildHumanModule(application, "human");
  const surface = application.surface("human") as HumanSurface;
  const mutation = surface.journeys.find(journey => journey.id === "archive-note")!;
  assert.equal(mutation.kind, "mutation");
  const frame = reviewFrame(surface, mutation,
    { title: "Independent title", body: "Independent body", state: "archived", owner: "private-actor", privateFact: "secret" },
    false, false, true);
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

test("review excludes the ownership field even when detail reading names it", () => {
  const { definition, human, read } = fixture();
  read.fields.push("owner");
  human.language.fields["note.owner"] = "Owner";
  human.commit["create-note"] = "review";
  const surface = compile(definition).surface("human") as HumanSurface;
  const mutation = surface.journeys.find(journey => journey.id === "create-note")!;
  assert.equal(mutation.kind, "mutation");
  const frame = reviewFrame(surface, mutation, { title: "Title", body: "Body", state: "active", owner: "actor" }, false, false, true);
  assert.equal(frame.content.kind, "review");
  assert.deepEqual(frame.content.details.fields, ["title", "body", "state"]);
  assert.equal(Object.hasOwn(frame.content.details.facts, "owner"), false);
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
