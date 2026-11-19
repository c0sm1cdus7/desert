// Reusing immutable reference schemas must retain validation and observe changes in mutable declarations.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { deepFreeze } from "../../journal/vocabulary.ts";
import { storedSchema } from "./secret-positions.ts";
it("reuses only immutable schemas and keeps their public validation frozen", () => {
  const schema = Type.Object({ value: Type.Number({ minimum: 2 }), private: Type.String({ secret: true }) });
  deepFreeze(schema);
  const prepared = storedSchema(schema);
  expect(storedSchema(schema)).toBe(prepared);
  expect(Value.Check(prepared, { value: 1, private: "synthetic" })).toBe(false);
  expect(() => Reflect.set(prepared, "required", [])).not.toThrow();
  expect(Reflect.set(prepared, "required", [])).toBe(false);
  expect(Value.Check(storedSchema(schema), {})).toBe(false);
});
it("rebuilds a mutable branch even when the schema root was frozen", () => {
  const schema = Type.Object({ value: Type.Number(), private: Type.String({ secret: true }) });
  Object.freeze(schema);
  expect(Value.Check(storedSchema(schema), { value: 1, private: "synthetic" })).toBe(true);
  Object.assign(schema.properties.value, { minimum: 2 });
  expect(Value.Check(storedSchema(schema), { value: 1, private: "synthetic" })).toBe(false);
});
