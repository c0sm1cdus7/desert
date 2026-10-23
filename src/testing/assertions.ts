import assert from "node:assert/strict";
import type { CommandDefinition, JourneyDefinition } from "../program-grammar.ts";
import type { Facts, Snapshot, Receipt } from "./types.ts";

export function assertMutation(command: CommandDefinition, input: Facts, actor: string,
  before: Snapshot, after: Snapshot, receipt: Receipt, subject?: string) {
  const previous = before.objects.find(object => object.id === subject);
  const actual = after.objects.find(object => object.id === receipt.object.id);
  assert.ok(actual, "MISSING_PERSISTED_OBJECT");
  assert.equal(actual.object_type, command.object);
  if (command.kind === "update") {
    assert.ok(previous, "MISSING_SUBJECT");
    assert.equal(actual.id, previous.id);
    for (const [field, value] of Object.entries(command.when)) assert.equal(previous.facts[field], value, "GUARD_VIOLATION");
    for (const [field, value] of Object.entries(previous.facts)) {
      if (!Object.hasOwn(command.set, field)) assert.deepEqual(actual.facts[field], value, "PRESERVATION_VIOLATION");
    }
    assert.deepEqual(Object.keys(actual.facts).sort(), Object.keys(previous.facts).sort(), "FACT_SHAPE_CHANGED");
  } else {
    assert.equal(before.objects.some(object => object.id === actual.id), false, "CREATE_REUSED_IDENTITY");
    assert.deepEqual(Object.keys(actual.facts).sort(), Object.keys(command.values).sort());
  }
  for (const [field, assignment] of Object.entries(command.kind === "create" ? command.values : command.set)) {
    switch (assignment.kind) {
      case "literal": assert.deepEqual(actual.facts[field], assignment.value, "LITERAL_VIOLATION"); break;
      case "input": assert.ok(Object.hasOwn(input, assignment.field));
        assert.deepEqual(actual.facts[field], input[assignment.field], "INPUT_ASSIGNMENT_VIOLATION"); break;
      case "actor": assert.equal(actual.facts[field], actor, "ACTOR_ASSIGNMENT_VIOLATION"); break;
      default: assert.fail("UNSUPPORTED_ASSIGNMENT");
    }
  }
  assert.equal(actual.version, (previous?.version ?? 0) + 1);
  assert.deepEqual(after.objects.filter(object => object.id !== actual.id),
    before.objects.filter(object => object.id !== subject), "UNRELATED_OBJECT_CHANGED");
  assert.equal(receipt.status, "completed");
  assert.equal(receipt.commandId, command.id);
  assert.deepEqual(receipt.object, { id: actual.id, type: command.object, version: actual.version });
  assert.deepEqual(after.receipts.filter(item => item.id !== receipt.id), before.receipts, "OTHER_RECEIPT_CHANGED");
  assert.deepEqual(after.receipts.filter(item => item.id === receipt.id), [receipt], "RECEIPT_NOT_ATOMIC");
}

export function assertRead(journey: Extract<JourneyDefinition, { kind: "read" }>,
  before: Snapshot, after: Snapshot, actual: unknown, ownerField: string, actor: string, subject?: string) {
  assert.deepEqual(after, before, "READ_CHANGED_DOMAIN");
  const fields = subject ? journey.fields : journey.collection;
  const expected = before.objects.filter(object => object.object_type === journey.object
    && object.facts[ownerField] === actor && (!subject || object.id === subject)
    && Object.entries(journey.where ?? {}).every(([field, value]) => object.facts[field] === value))
    .map(object => ({ id: object.id, version: object.version,
      facts: Object.fromEntries(fields.map(field => [field, object.facts[field]])) }));
  assert.deepEqual(actual, expected, "READ_PROJECTION_OR_AUTHORITY_VIOLATION");
}
