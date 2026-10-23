import assert from "node:assert/strict";
import test from "node:test";
import { factState, presentFact, presentFacts, presentTitle } from "../src/interaction/fact-presentation.ts";
import { compile } from "../src/compile.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import type { HumanSurface } from "../src/web/types.ts";
import type { ProductDefinition } from "../src/contracts.ts";

test("fact state distinguishes absence from literal content without rewriting values", () => {
  for (const value of [undefined, null]) {
    assert.equal(factState(value), "unknown");
    assert.equal(presentFact(value), "Unknown");
  }
  for (const value of ["", " ", "\n\t "]) {
    assert.equal(factState(value), "empty");
    assert.equal(presentFact(value), "Empty");
  }
  for (const value of [0, 42, "Empty", "Unknown", " First\n\nSecond "]) {
    assert.equal(factState(value), "known");
    assert.equal(presentFact(value), String(value));
  }
  assert.equal(presentTitle(" \n "), "Untitled", "title fallback remains a separate contract");
});

test("fact projection preserves source facts and does not expose inherited values", () => {
  const definition: ProductDefinition = protocolNotebookDefinition();
  Object.assign(definition.objects[0]!.facts, { toString: { kind: "text" } });
  const read = definition.journeys!.find(journey => journey.kind === "read")!;
  assert.equal(read.kind, "read");
  read.fields.push("toString");
  const create = definition.journeys!.find(journey => journey.kind === "mutation" && journey.command.kind === "create")!;
  assert.equal(create.kind, "mutation");
  assert.equal(create.command.kind, "create");
  Object.assign(create.command.values, { toString: { kind: "literal", value: "Owned fact" } });
  const human = definition.surfaces!.find(surface => surface.kind === "human")!;
  assert.equal(human.kind, "human");
  human.language.fields["note.toString"] = "Own fact";
  human.fieldRepresentations["note.toString"] = "text";
  const surface = compile(definition).surface("human") as HumanSurface;
  const facts = Object.freeze({ title: "  ", body: " First\n\nSecond " });
  const snapshot = structuredClone(facts);
  const result = presentFacts(surface, "note", ["title", "body", "toString"], facts);
  assert.deepEqual(result.facts, snapshot);
  assert.deepEqual(facts, snapshot);
  assert.equal(Object.hasOwn(result.facts, "toString"), false);
});
