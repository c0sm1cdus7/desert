import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { RuntimeConnectionPolicy } from "../src/connection-policy.ts";
import type { ObjectDefinition } from "../src/contracts.ts";
import type { JourneyDefinition } from "../src/program-grammar.ts";
import { compileExposures } from "../src/modules/compile-exposures.ts";
import type { OwnedDefinitions } from "../src/modules/types.ts";

type Field = { object: string; field: string };

function fixture(references: Field[]) {
  const objects: ObjectDefinition[] = references.map(({ object, field }) => ({
    id: object, facts: { [field]: { kind: "text" }, target: { kind: "text" }, owner: { kind: "principal" } },
  }));
  const journeys: JourneyDefinition[] = references.map(({ object, field }, index) => ({
    id: `read-${index}`, kind: "read", object, fields: [field], collection: [field],
    requires: { controller: "controller", dependencies: [] },
  }));
  return { objects, journeys };
}

function authoredSurface({ objects, journeys }: ReturnType<typeof fixture>) {
  const owner: OwnedDefinitions = {
    objects: objects.map(object => ({ ...object, presentation: {
      view: `${object.id}-view`, title: { object: object.id, field: "target" }, actions: [],
      fields: Object.keys(object.facts).filter(field => field !== "owner").map(field => ({
        fact: { object: object.id, field }, label: `${object.id} ${field}`, representation: "text" as const,
      })),
    } })),
    journeys: journeys.map(execution => execution.kind === "mutation"
      ? { execution, label: execution.id, humanReview: "not-required" as const }
      : { execution, label: execution.id }),
  };
  return compileExposures([{
    id: "human", kind: "human", locale: "en", journeys: journeys.map(journey => journey.id),
  }], [owner])[0]!;
}

function compileCanonical({ objects, journeys }: ReturnType<typeof fixture>) {
  const presented = journeys.flatMap(journey => {
    const object = journey.kind === "read" ? journey.object : journey.command.object;
    const fields = journey.kind === "read" ? journey.fields
      : journey.command.kind === "create" ? journey.command.input : Object.keys(journey.command.set);
    return fields.map(field => [`${object}.${field}`, field]);
  });
  return compile({
    id: "field-identities", objects, journeys,
    dependencies: [{ id: "controller", kind: "controller", objects: objects.map(object => object.id), requires: [] }],
    policies: objects.map(object => ({ kind: "ownership", object: object.id, field: "owner" })),
    surfaces: [{ id: "human", kind: "human", journeys: journeys.map(journey => journey.id),
      fieldRepresentations: Object.fromEntries(presented.map(([key]) => [key, "text"])),
      commit: Object.fromEntries(journeys.filter(journey => journey.kind === "mutation").map(journey => [journey.id, "submit"])),
      language: { locale: "en", fields: Object.fromEntries(presented),
        journeys: Object.fromEntries(journeys.map(journey => [journey.id, journey.id])) },
      connection: RuntimeConnectionPolicy,
    }],
  });
}

for (const admit of [authoredSurface, compileCanonical]) {
  test(`${admit.name}: distinct object and field pairs cannot silently share a human wire key`, () => {
    const source = fixture([{ object: "a", field: "b.c" }, { object: "a.b", field: "c" }]);
    assert.throws(() => admit(source), { message: "AMBIGUOUS_SURFACE_FIELD_KEY" });
    assert.throws(() => admit({ ...source, journeys: [...source.journeys].reverse() }), {
      message: "AMBIGUOUS_SURFACE_FIELD_KEY",
    });
  });

  test(`${admit.name}: inputs and presented fields share one collision boundary`, () => {
    const source = fixture([{ object: "a", field: "b.c" }, { object: "a.b", field: "c" }]);
    source.journeys[0] = {
      id: "update-first", kind: "mutation", requires: { controller: "controller", dependencies: [] },
      command: { id: "update-first-command", kind: "update", object: "a", input: ["b.c"], when: {},
        set: { target: { kind: "input", field: "b.c" } } },
      confirmation: "prepared-effect", outcome: "receipt",
    };
    assert.throws(() => admit(source), { message: "AMBIGUOUS_SURFACE_FIELD_KEY" });
    assert.throws(() => admit({ ...source, journeys: [...source.journeys].reverse() }), {
      message: "AMBIGUOUS_SURFACE_FIELD_KEY",
    });
  });
}

test("Dotted identities and repeated references to the same field remain valid", () => {
  const source = fixture([{ object: "a.b", field: "c.d" }]);
  source.journeys.push({ ...source.journeys[0]!, id: "second-read" });
  const lowered = authoredSurface(source);
  assert.equal(lowered.kind, "human");
  if (lowered.kind !== "human") throw new Error("Expected a human exposure");
  assert.deepEqual(lowered.language.fields, { "a.b.c.d": "a.b c.d" });
  assert.doesNotThrow(() => compileCanonical(source));
  source.journeys.push({
    id: "edit-same-field", kind: "mutation", requires: { controller: "controller", dependencies: [] },
    command: { id: "edit-same-field-command", kind: "update", object: "a.b", input: ["c.d"], when: {},
      set: { "c.d": { kind: "input", field: "c.d" } } },
    confirmation: "prepared-effect", outcome: "receipt",
  });
  assert.deepEqual(authoredSurface(source).kind, "human");
  assert.doesNotThrow(() => compileCanonical(source));
});
