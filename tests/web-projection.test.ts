import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";

test("the renderer receives authored field order and object references, without private effects", () => {
  const surface = compile(Notebook).surface("human");
  const create = surface.journeys.find(journey => journey.id === "create-note")!;
  assert.ok(create.kind === "mutation");
  assert.deepEqual(create.inputFields, ["title", "body"]);
  assert.equal(create.object, "note");
  assert.equal("values" in create, false);
  const read = surface.journeys.find(journey => journey.id === "read-note")!;
  assert.ok(read.kind === "read");
  assert.deepEqual(read.fields, ["title", "body", "state"]);
  assert.deepEqual(read.collection, ["title", "state"]);
});
