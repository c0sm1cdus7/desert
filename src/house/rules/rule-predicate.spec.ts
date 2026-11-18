// Prueba cada operador, sus bordes temporales y referencias públicas sin evaluar código.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { evaluatePredicate, ruleProblem } from "./rule-predicate.ts";
import type { Predicate, RuleContext } from "./rule-schema.ts";
const context: RuleContext = {
  input: { amount: 10, currency: "ARS", absent: null },
  actor: "ana",
  admin: "ana",
  now: 0,
  inJourney: false,
};
const amount = { source: "input", path: "amount" } as const;
const schema = Type.Object({ amount: Type.Number(), currency: Type.String(), absent: Type.Null() });
const check = (condition: Predicate) => {
  expect(
    ruleProblem(
      { id: "test", text: "Prueba", action: { tool: "probe", act: "send" }, condition, effect: "frena" },
      schema,
    ),
  ).toBeUndefined();
  return evaluatePredicate(condition, context);
};
it("igualdad, pertenencia, comparación y combinaciones conservan el tipo", () => {
  expect(check({ operator: "equal", field: amount, value: { kind: "number", value: 10 } })).toBe(true);
  expect(
    check({
      operator: "in",
      field: amount,
      values: [
        { kind: "number", value: 5 },
        { kind: "number", value: 10 },
      ],
    }),
  ).toBe(true);
  for (const [operator, expected] of [
    ["gt", false],
    ["gte", true],
    ["lt", false],
    ["lte", true],
  ] as const)
    expect(check({ operator, field: amount, value: 10 })).toBe(expected);
  const yes: Predicate = { operator: "actor", kind: "identity", id: "ana" };
  const no: Predicate = { operator: "actor", kind: "program" };
  expect(check({ operator: "all", conditions: [yes, no] })).toBe(false);
  expect(check({ operator: "any", conditions: [no, yes] })).toBe(true);
  expect(check({ operator: "not", condition: no })).toBe(true);
  expect(check({ operator: "equal", field: { source: "input", path: "absent" }, value: { kind: "null" } })).toBe(true);
});
it("el actor y las proyecciones del core no vienen de la entrada", () => {
  expect(
    check({ operator: "equal", field: { source: "core", path: "isAdmin" }, value: { kind: "boolean", value: true } }),
  ).toBe(true);
  const predicate: Predicate = { operator: "actor", kind: "assistant", id: "assistant:ana" };
  expect(evaluatePredicate(predicate, { ...context, actor: "assistant:ana" })).toBe(true);
  expect(evaluatePredicate(predicate, { ...context, input: { actor: "assistant:ana", isAdmin: true } })).toBe(false);
});
it("horario incluye el inicio y excluye el fin, con UTC explícito y cruce de medianoche", () => {
  const predicate: Predicate = { operator: "schedule", from: 23 * 60, until: 2 * 60, offsetMinutes: -180, days: [1] };
  for (const [date, expected] of [
    ["2026-11-17T01:59:00Z", false],
    ["2026-11-17T02:00:00Z", true],
    ["2026-11-17T04:59:00Z", true],
    ["2026-11-17T05:00:00Z", false],
    ["2026-11-18T03:00:00Z", false],
  ] as const)
    expect(evaluatePredicate(predicate, { ...context, now: Date.parse(date) })).toBe(expected);
});
it("limita tamaño y profundidad, rechaza accesores y claves fuera de toda rama declarada", () => {
  const definition = {
    id: "test",
    text: "Prueba",
    action: { tool: "probe", act: "send" },
    condition: { operator: "gt", field: amount, value: 10 },
    effect: "frena",
  };
  const cyclic: Record<string, unknown> = { operator: "not" };
  cyclic.condition = cyclic;
  expect(ruleProblem({ ...definition, condition: cyclic }, schema)).toBeDefined();
  let touched = false;
  const accessor = Object.defineProperty({}, "operator", {
    get: () => {
      touched = true;
      return "actor";
    },
  });
  expect(ruleProblem({ ...definition, condition: accessor }, schema)).toBeDefined();
  expect(touched).toBe(false);
  expect(ruleProblem(definition, Type.Union([schema, Type.Object({ currency: Type.String() })]))).toBeDefined();
  expect(ruleProblem(definition, Type.Union([schema, schema]))).toBeUndefined();
});
