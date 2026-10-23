import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { EditingNotebook } from "./fixtures/editing-notebook.ts";

function product(when: unknown) {
  return { ...EditingNotebook, journeys: EditingNotebook.journeys.map(journey =>
    journey.id === "edit-note" && journey.kind === "mutation"
      ? { ...journey, command: { ...journey.command, when } } : journey) };
}

test("an explicit empty domain predicate does not require a fabricated status fact", () => {
  const application = compile(product({}));
  assert.ok(application.surface("human").journeys.some(journey => journey.id === "edit-note"));
  assert.deepEqual(application.executionPlan().policies, EditingNotebook.policies,
    "empty domain conditions must not remove the ownership policy");
});

test("unknown or malformed conditions still fail; empty is not missing or invalid", () => {
  for (const when of [undefined, null, [], { nonexistent: "active" }, { state: 42 }]) {
    assert.throws(() => compile(product(when)));
  }
});
