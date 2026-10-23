import assert from "node:assert/strict";
import test from "node:test";
import { assertMutation } from "../src/testing/assertions.ts";
import { CreateItem } from "./fixtures/labels.ts";
import type { Snapshot, Receipt } from "../src/testing/types.ts";

test("independent effect verification compares labels by ordered value, never JavaScript alias identity", () => {
  const input = { title: "Task", projects: ["A", "B"] };
  const receipt: Receipt = { id: "receipt", runId: "run", commandId: CreateItem.command.id,
    status: "completed", object: { id: "item", type: "labeled-item", version: 1 } };
  const before: Snapshot = { objects: [], receipts: [] };
  const after: Snapshot = { objects: [{ id: "item", object_type: "labeled-item", version: 1,
    facts: { ...structuredClone(input), owner: "owner" } }], receipts: [receipt] };
  assert.doesNotThrow(() => assertMutation(CreateItem.command, input, "owner", before, after, receipt));
  for (const projects of [["A"], ["B", "A"], ["A", "C"]]) {
    const changed = structuredClone(after);
    changed.objects[0]!.facts.projects = projects;
    assert.throws(() => assertMutation(CreateItem.command, input, "owner", before, changed, receipt), /INPUT_ASSIGNMENT_VIOLATION/);
  }
});

test("independent verification still rejects changes to untouched structured facts", () => {
  const command = { id: "rename", kind: "update", object: "labeled-item", input: ["title"], when: {},
    set: { title: { kind: "input", field: "title" } } } as const;
  const before: Snapshot = { objects: [{ id: "item", object_type: "labeled-item", version: 1,
    facts: { title: "Before", projects: ["A", "B"], owner: "owner" } }], receipts: [] };
  const receipt: Receipt = { id: "receipt", runId: "run", commandId: command.id,
    status: "completed", object: { id: "item", type: "labeled-item", version: 2 } };
  const after = structuredClone(before);
  after.objects[0]!.version = 2;
  after.objects[0]!.facts.title = "After";
  after.receipts.push(receipt);
  assert.doesNotThrow(() => assertMutation({ ...command, input: [...command.input] }, { title: "After" }, "owner", before, after, receipt, "item"));
  after.objects[0]!.facts.projects = ["B", "A"];
  assert.throws(() => assertMutation({ ...command, input: [...command.input] }, { title: "After" }, "owner", before, after, receipt, "item"), /PRESERVATION_VIOLATION/);
});
