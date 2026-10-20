import assert from "node:assert/strict";
import test from "node:test";
import type { ProductDefinition } from "../src/contracts.ts";
import { deriveVerification } from "../src/testing/index.ts";
import { localPostgresTestHost } from "../src/testing/postgres.ts";
import { fieldValues, accepts } from "../src/testing/values.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { Notebook } from "../products/notebook/product.ts";

test("renamed objects, policies, fields and journeys plus new integer inputs need no new fixtures", { timeout: 90000 }, async () => {
  const renamed: ProductDefinition = JSON.parse(JSON.stringify(SharedProduct)
    .replace(/\b(memo|bookmark|workspace|state|owner|title|address|active|archived|saved|removed)\b/g, match => "renamed_" + match));
  const object = renamed.objects[0]!;
  object.facts.rank = { kind: "integer", minimum: 2, maximum: 3 };
  for (const journey of renamed.journeys!) {
    if (journey.kind === "mutation" && journey.command.object === object.id) {
      if (journey.command.kind === "create") {
        journey.command.input.push("rank");
        journey.command.values.rank = { kind: "input", field: "rank" };
      } else {
        journey.command.input.push("rank");
        journey.command.set.rank = { kind: "input", field: "rank" };
      }
    }
  }
  const additional = structuredClone(renamed.journeys!.find(journey => journey.kind === "read")!);
  additional.id = "additional-read";
  renamed.journeys!.push(additional);
  renamed.surfaces![0]!.journeys.push(additional.id);
  const verification = deriveVerification(renamed);
  const report = await verification.run({ host: localPostgresTestHost(), seed: 11 });
  assert.deepEqual(report.cases.filter(item => item.status !== "passed"), []);
  verification.assertComplete(report);
  assert.equal(report.cases.filter(item => item.journeyId === additional.id).length, 5);
});

test("unreachable generated preparation stays blocked, never silently skipped", { timeout: 90000 }, async () => {
  const changed = structuredClone(Notebook);
  changed.journeys[0].command.values.state = { kind: "literal", value: "archived" };
  const verification = deriveVerification(changed);
  const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
  assert.ok(report.cases.some(item => item.status === "passed"));
  assert.ok(report.cases.some(item => item.status === "blocked" && item.reason === "NO_GENERATED_SETUP"));
  assert.equal(report.cases.length, verification.cases.length);
  assert.throws(() => verification.assertComplete(report), /UNSATISFIED_OBLIGATIONS/);
});

test("new and unexposed journeys add obligations instead of disappearing", () => {
  const changed: ProductDefinition = structuredClone(SharedProduct);
  const extra = structuredClone(changed.journeys![0]!);
  extra.id = "additional";
  changed.journeys!.push(extra);
  const plan = deriveVerification(changed);
  assert.ok(plan.cases.some(item => item.journeyId === extra.id && item.surfaceId === ""));
  assert.ok(plan.cases.length > deriveVerification(SharedProduct).cases.length);
});

test("primitive generators respect finite bounds and refuse oversized evidence instead of truncating it", () => {
  for (const field of [
    { kind: "integer", minimum: 5, maximum: 7 },
    { kind: "integer", minimum: -8, maximum: -2 },
    { kind: "text", minLength: 2, maxLength: 4 },
    { kind: "enum", values: ["one", "two"] },
  ] as const) {
    const mutable = structuredClone(field);
    // Enum fields are mutable in the current authoring grammar.
    const definition = mutable.kind === "enum" ? { ...mutable, values: [...mutable.values] } : mutable;
    assert.ok(fieldValues(definition, 42).every(value => accepts(definition, value)));
    assert.deepEqual(fieldValues(definition, 42), fieldValues(definition, 42));
  }
  assert.equal(accepts({ kind: "text", minLength: 1, maxLength: 1 }, "🌵"), true);
  assert.throws(() => fieldValues({ kind: "text", minLength: 1025 }, 42), /TEXT_GENERATION_LIMIT/);
});
