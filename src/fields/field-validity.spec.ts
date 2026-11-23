import { Type } from "@sinclair/typebox";
import { said } from "./phrases.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { expect, it, vi } from "vitest";
import { day, fieldValidity, holding, quantity } from "./fields.ts";

it("rejects a value outside its schema before calling its semantic rule", () => {
  const wrong = vi.fn(() => "semantic");
  const schema = holding(Type.String({ minLength: 2 }), wrong);
  expect(fieldValidity(schema, "x", 17)).toEqual({ invalid: true, wrong: undefined });
  expect(wrong).not.toHaveBeenCalled();
  expect(fieldValidity(schema, 4, 17)).toEqual({ invalid: true, wrong: undefined });
});
it("checks precision before semantic rules", () => {
  expect(fieldValidity(quantity("Cantidad"), 1.2345, 17)).toEqual({ invalid: true, wrong: undefined });
  expect(fieldValidity(quantity("Cantidad"), 1.234, 17)).toEqual({ invalid: false, wrong: undefined });
});
it("preserves semantic reasons and the exact instant", () => {
  const wrong = vi.fn((_value: string, at: number) => (at === 17 ? "cerrado" : undefined));
  expect(fieldValidity(holding(Type.String(), wrong), "datum", 17)).toEqual({ invalid: false, wrong: "cerrado" });
  expect(wrong).toHaveBeenCalledWith("datum", 17);
  expect(said(fieldValidity(day("Día"), "2025-02-30", 17).wrong ?? "", "es")).toBe("día inexistente");
});
it.each([
  [Type.Array(quantity("Cantidad")), [1.2345]],
  [Type.Object({ amount: quantity("Cantidad") }), { amount: 1.2345 }],
  [Type.Union([Type.Null(), quantity("Cantidad")]), 1.2345],
])("checks nested precision in every shape", (schema, value) => {
  expect(fieldValidity(schema, value, 17).invalid).toBe(true);
});
it.each([
  [Type.Array(day("Día")), ["2025-02-30"]],
  [Type.Object({ date: day("Día") }), { date: "2025-02-30" }],
  [Type.Union([Type.Null(), day("Día")]), "2025-02-30"],
])("checks semantic rules in every shape", (schema, value) => {
  expect(fieldValidity(schema, value, 17)).toEqual({ invalid: false, wrong: toolTexts.noSuchDay });
});
it("accepts null, primitives, empty containers and unmatched union arms", () => {
  for (const [schema, value] of [
    [Type.Null(), null],
    [Type.Boolean(), true],
    [Type.String(), "ok"],
    [Type.Array(day("Día")), []],
    [Type.Object({}), {}],
    [Type.Union([day("Día"), Type.Null()]), null],
    [Type.Union([quantity("Cantidad"), Type.Literal("none")]), "none"],
  ] as const)
    expect(fieldValidity(schema, value, 17)).toEqual({ invalid: false, wrong: undefined });
});
it("keeps the first semantic reason after skipping valid siblings", () => {
  const field = holding(Type.String(), value => (value === "ok" ? undefined : value));
  const schema = Type.Object({ values: Type.Array(field), later: field });
  expect(fieldValidity(schema, { values: ["ok", "first", "second"], later: "third" }, 17).wrong).toBe("first");
});
it("ignores non-callable semantic metadata and does not apply string rules to numbers", () => {
  const wrong = vi.fn(() => "solo texto");
  expect(fieldValidity(holding(Type.Number(), wrong), 1.23456, 17)).toEqual({ invalid: false, wrong: undefined });
  expect(wrong).not.toHaveBeenCalled();
  expect(fieldValidity(Type.String({ wrong: 37, decimals: "2" }), "ok", 17)).toEqual({
    invalid: false,
    wrong: undefined,
  });
});
