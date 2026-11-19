// Rule history keeps drafts, active versions and withdrawals through replay.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { ruleProblem, evaluatePredicate } from "./rule-predicate.ts";
import { emptyRules, rulesStep } from "./rule-state.ts";
import { effect, type HouseEmission, type HouseEvent } from "../facts.ts";
import type { RuleDefinition } from "./rule-schema.ts";
const definition: RuleDefinition = {
  id: "limit",
  text: "No pasar de diez",
  action: { tool: "probe", act: "send" },
  condition: { operator: "gt", field: { source: "input", path: "amount" }, value: 10 },
  effect: "block",
};
const schema = Type.Object({ amount: Type.Number() });
const event = (value: HouseEmission, seq: number): HouseEvent => ({ ...value, id: `e${seq}`, seq, at: seq });
it("keeps every version; another author's draft does not replace the active rule", () => {
  let state = emptyRules;
  state = rulesStep(
    state,
    event(effect("rule-versioned", { definition, version: 1, previous: null }, "ana"), 1),
    "ana",
  );
  state = rulesStep(
    state,
    event(
      effect("rule-versioned", { definition: { ...definition, text: "Cambio" }, version: 2, previous: 1 }, "beto"),
      2,
    ),
    "ana",
  );
  expect(state.active.get("limit")).toBe(1);
  expect(state.versions.get("limit")?.length).toBe(2);
  state = rulesStep(state, event(effect("rule-approved", { id: "limit", version: 2 }, "ana"), 3), "ana");
  expect(state.active.get("limit")).toBe(2);
  state = rulesStep(state, event(effect("rule-retired", { id: "limit", version: 2 }, "ana"), 4), "ana");
  expect(state.active.has("limit")).toBe(false);
  expect(state.versions.get("limit")?.length).toBe(2);
});
it("rejects code, arbitrary fields, secret fields and numeric comparisons against strings", () => {
  expect(ruleProblem(definition, schema)).toBeUndefined();
  for (const condition of [
    { operator: "javascript", code: "process.exit()" },
    { operator: "equal", field: { source: "input", path: "constructor.name" }, value: { kind: "text", value: "x" } },
    { operator: "gt", field: { source: "input", path: "amount" }, value: "10" },
  ])
    expect(ruleProblem({ ...definition, condition }, schema)).toBeDefined();
  expect(ruleProblem(definition, Type.Object({ amount: Type.String() }))).toBeDefined();
  expect(ruleProblem(definition, Type.Object({ amount: Type.Number({ secret: true }) }))).toBeDefined();
});
it("combines comparisons using a verified actor and clock", () => {
  expect(
    evaluatePredicate(definition.condition, {
      input: { amount: 11 },
      actor: "ana",
      admin: "ana",
      now: 0,
      inJourney: false,
    }),
  ).toBe(true);
  expect(
    evaluatePredicate(definition.condition, {
      input: { amount: 10 },
      actor: "ana",
      admin: "ana",
      now: 0,
      inJourney: false,
    }),
  ).toBe(false);
});
