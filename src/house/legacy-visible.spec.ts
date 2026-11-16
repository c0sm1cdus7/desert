import { expect, it } from "vitest";
import { text } from "../fields/fields.ts";
import { object } from "../fields/visible-text.ts";
import { vocabulary } from "../journal/facts.ts";
import { Value } from "@sinclair/typebox/value";
import { Type } from "@sinclair/typebox";
it.each(["⠀", "\u200b", "ㅤ"])("reads a previously valid text while rejecting new emissions: %s", name => {
  const words = vocabulary({ sold: object({ name: text("Nombre", "") }) });
  const emission = words.fact("sold", { name }, "ana");
  expect(Value.Check(words.emission, emission)).toBe(false);
  expect(words.read({ ...emission, id: "1", seq: 1, at: 0 }).data).toEqual({ name });
});
it("keeps the old whitespace rule and other constraints, including in nested fields", () => {
  const words = vocabulary({
    sold: object({ nested: object({ name: text("Nombre", "") }), code: Type.String({ pattern: "^ok$" }) }),
  });
  const event = (name: string, code = "ok") => ({
    ...words.fact("sold", { nested: { name }, code }, "ana"),
    id: "1",
    seq: 1,
    at: 0,
  });
  expect(words.read(event("\u200b")).data).toEqual({ nested: { name: "\u200b" }, code: "ok" });
  expect(() => words.read(event(" "))).toThrow();
  expect(() => words.read(event("\u200b", "bad"))).toThrow();
  expect(() => words.read(event("x".repeat(121)))).toThrow();
});
