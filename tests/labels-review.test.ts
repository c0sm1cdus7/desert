import assert from "node:assert/strict";
import test from "node:test";
import { reviewChanges } from "../src/interaction/review-changes.ts";
import { surface } from "./fixtures/labels.ts";

test("review describes structured changes without a misleading Labels to Labels comparison", () => {
  const edit = surface.journeys.find(journey => journey.id === "edit-item");
  assert.ok(edit?.kind === "mutation");
  const result = reviewChanges(surface, { ...edit, reviewFields: ["title", "projects"] },
    { title: "A task", projects: ["VOID"] }, { title: "A task", projects: ["DESERT"] });
  assert.equal(result.summary, "1 field will change. Review the updated value first.");
  assert.deepEqual(result.fields, ["projects", "title"]);
});
