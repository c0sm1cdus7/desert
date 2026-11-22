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
import { mindText } from "../../house/minds/journey-facts.ts";
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
  expect(sent).toMatchObject({ properties: { plain: { type: "string", title: "Text" } } });
  expect(JSON.stringify(sent)).not.toMatch(/"(pattern|format|minLength|maxLength|default)"/);
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
  // Ranges, formats and patterns are checked by the house on every answer; the provider only receives the shape.
  expect(serialized).not.toMatch(/"(?:exclusiveMinimum|minimum|maximum|format|pattern|minLength|maxLength|default)":/);
  expect(matchesSchema(schema, { amount: 0 })).toBe(false);
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
it("preserves validation-shaped payloads in const and property names and keeps defaults local", () => {
  const schema = object({ plain: Type.Literal("placeholder"), data: Type.Object({}, { default: { typo: true } }) });
  const sent = providerSchema(schema);
  expect(sent).toMatchObject({ properties: { plain: { const: "placeholder" }, data: { type: "object" } } });
  expect(JSON.stringify(sent)).not.toContain('"default"');
});
it("sends exclusive branches as plain branches and never two branch sets with the same name", () => {
  expect(providerSchema({ oneOf: [{ type: "string" }, { type: "number" }] })).toEqual({
    anyOf: [{ type: "string" }, { type: "number" }],
  });
  expect(() => providerSchema({ oneOf: [{ type: "string" }], anyOf: [{ type: "number" }] })).toThrow("schema branches");
});
it("says in each field's description every limit the provider cannot enforce, without the pattern itself", () => {
  const schema = object({
    text: mindText,
    seconds: Type.Integer({ minimum: 1, maximum: 86400 }),
    names: Type.Array(Type.String({ maxLength: 160 }), { maxItems: 8, uniqueItems: true }),
    job: Type.String({ title: "Trabajo", pattern: "^[a-f0-9-]{36}$" }),
  });
  const sent = providerSchema(schema);
  const serialized = JSON.stringify(sent);
  expect(serialized).not.toMatch(/"(?:minimum|maximum|pattern|minLength|maxLength|maxItems|uniqueItems)":/);
  expect(serialized).not.toContain("u0000");
  expect(sent).toMatchObject({
    properties: {
      text: { type: "string", description: "De 1 a 4000 caracteres. Texto visible: ni vacío ni solo espacios." },
      seconds: { type: "integer", description: "De 1 a 86400." },
      names: {
        type: "array",
        description: "Hasta 8 elementos. Sin repetidos.",
        items: { description: "Hasta 160 caracteres." },
      },
      job: { title: "Trabajo", description: "Con el formato ^[a-f0-9-]{36}$." },
    },
  });
});
