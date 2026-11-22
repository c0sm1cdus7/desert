// Reference spelling and nested secret declarations are shared with storage protection.
import { executionSchema, hasSecretInput, referencePattern } from "./secret-input.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { deepFreeze } from "../../journal/vocabulary.ts";
import { isRecord } from "../../fields/json-values.ts";
import { expect, it } from "vitest";

it("referencePattern matches only a complete lowercase hexadecimal secret reference", () => {
  const valid = "secret:01234567-89ab-cdef-0123-456789abcdef";
  const pattern = new RegExp(referencePattern, "u");
  expect(pattern.test(valid)).toBe(true);
  for (const value of [
    "",
    valid.slice(1),
    `x${valid}`,
    `${valid}x`,
    `${valid}\n`,
    valid.toUpperCase(),
    valid.replace("89ab", "89ag"),
    valid.replace("89ab", "89a"),
    valid.replace("89ab", "89abc"),
    valid.replace("secret:", "other:"),
    valid.replace("-", ""),
  ])
    expect(pattern.test(value)).toBe(false);
});

it("hasSecretInput finds exact true marks through objects and array children, but not bare arrays", () => {
  for (const schema of [
    { secret: true },
    { properties: { nested: { items: { secret: true } } } },
    { anyOf: [{ type: "string" }, { properties: { value: { secret: true } } }] },
  ])
    expect(hasSecretInput(schema)).toBe(true);
  for (const schema of [
    null,
    undefined,
    "secret",
    false,
    {},
    { secret: false },
    { secret: "true" },
    { properties: { value: { type: "string" } } },
    { anyOf: [null, {}, false] },
    [{ secret: true }],
  ])
    expect(hasSecretInput(schema)).toBe(false);
});

it("does not keep an old preparation if a schema branch changes", () => {
  const schema = Type.Object({ value: Type.Number() });
  Object.freeze(schema);
  expect(Value.Check(executionSchema(schema), { value: 1 })).toBe(true);
  Object.assign(schema.properties.value, { minimum: 2 });
  expect(Value.Check(executionSchema(schema), { value: 1 })).toBe(false);
});

it("detects a position that becomes private under a frozen root", () => {
  const schema = Object.freeze(Type.Object({ value: Type.String() }));
  expect(hasSecretInput(schema)).toBe(false);
  Object.assign(schema.properties.value, { secret: true });
  expect(hasSecretInput(schema)).toBe(true);
});

it("a shared preparation does not allow changing what the next execution accepts", () => {
  const schema = Type.Object({ value: Type.Number({ minimum: 2 }) });
  deepFreeze(schema);
  const prepared = executionSchema(schema);
  const properties: unknown = Reflect.get(prepared, "properties");
  if (!isRecord(properties) || !isRecord(properties.value)) throw new Error("Missing prepared field");
  const field = properties.value;
  expect(() => Object.assign(field, { minimum: 0 })).toThrow();
  expect(Value.Check(executionSchema(schema), { value: 1 })).toBe(false);
});
