import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { isSchema } from "./schema-shape.ts";

it("validates a mutable schema again, even with its root frozen", () => {
  const nested = { ...Type.String() };
  const schema = Object.freeze(Type.Object({ value: nested }));
  expect(isSchema(schema)).toBe(true);
  Object.assign(nested, { type: "invalid" });
  expect(isSchema(schema)).toBe(false);
});

it("reuses immutable schemas without admitting invalid shapes", () => {
  const child = Object.freeze(Type.String());
  const schema = Object.freeze({
    ...Type.Object({ value: child }),
    properties: Object.freeze({ value: child }),
    required: Object.freeze(["value"]),
  });
  expect(isSchema(schema)).toBe(true);
  expect(isSchema(schema)).toBe(true);
  expect(isSchema(Object.freeze({ type: "invalid" }))).toBe(false);
});
