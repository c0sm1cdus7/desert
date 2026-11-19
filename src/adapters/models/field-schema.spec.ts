// Exercises field translation without letting metadata hide unknown or unenforced constraints.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import {
  text,
  quantity,
  count,
  day,
  thing,
  someOf,
  option,
  many,
  digits,
  padded,
  handle,
  when,
  money,
} from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { matchesSchema, providerSchema } from "./schema.ts";
const field = { ...text("Text", "Example"), verbatim: true };
it("removes surface metadata recursively and retains the complete local text constraints", () => {
  const schema = object({
    nested: Type.Array(object({ body: field })),
    plain: field,
    placeholder: field,
    verbatim: field,
  });
  const sent = providerSchema(schema);
  expect(sent).toMatchObject({ properties: { plain: { type: "string", pattern: field.pattern, title: "Text" } } });
  expect(JSON.stringify(sent)).not.toMatch(/"plain":true|"verbatim":true|"placeholder":"Example"/);
  const value = { nested: [{ body: "Mate" }], plain: "yes", placeholder: "yes", verbatim: "yes" };
  expect(matchesSchema(schema, value)).toBe(true);
  for (const body of ["", " ", "x".repeat(121), 1])
    expect(matchesSchema(schema, { ...value, nested: [{ body }] })).toBe(false);
  expect(matchesSchema(schema, { ...value, extra: true })).toBe(false);
  expect(field).toMatchObject({ plain: true, verbatim: true, placeholder: "Example", minLength: 1, maxLength: 120 });
});
it("recognizes the field vocabulary without serializing callbacks or presentation objects", () => {
  const schema = object({
    amount: quantity("Amount"),
    count: count("Count"),
    date: day("Date", "today", "today"),
    money: money("Price"),
    choice: thing("Thing", "notes", "None", "add", "Empty"),
    selected: someOf("Some", "all", option("a", "A", "a")),
    list: many(field, { ask: "More", done: { title: "Done", key: "d" }, another: { title: "Another", key: "a" } }),
    digits: digits("Code", "##-##"),
    padded: padded("Number", 3),
    handle: handle("Name", "Example", "a-z", 10),
    optional: when(field, () => true),
  });
  const serialized = JSON.stringify(providerSchema(schema));
  expect(serialized).not.toMatch(/"(?:mask|wrong|decimals|more|when|some|of|shapes|width|allowed)":/);
  expect(serialized).toContain('"exclusiveMinimum":0');
});
it.each([
  { type: "string", typo: true },
  { type: "object", properties: { absent: { type: "string", typo: true } } },
  { anyOf: [{ type: "string" }, { type: "number", typo: true }] },
  { type: "array", items: { type: "string" }, contains: { typo: true } },
  { $defs: { unused: { typo: true } }, type: "string" },
  { $defs: { value: { type: "string" } }, $ref: "#/$defs/value", typo: true },
  { type: "object", additionalProperties: { typo: true } },
])("rejects unknown keywords even in unused or reduced branches: %j", schema => {
  expect(() => providerSchema(schema)).toThrow("schema keyword: typo");
  expect(() => matchesSchema(schema, "valid")).toThrow("schema keyword: typo");
});
it("preserves validation-shaped payloads in enum, default and property names", () => {
  const schema = object({ plain: Type.Literal("placeholder"), data: Type.Object({}, { default: { typo: true } }) });
  expect(providerSchema(schema)).toMatchObject({
    properties: { plain: { const: "placeholder" }, data: { default: { typo: true } } },
  });
});
