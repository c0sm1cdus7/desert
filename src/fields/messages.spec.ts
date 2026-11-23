import { describe, expect, expectTypeOf, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { defineMessage } from "./messages.ts";
import { languages, type Language } from "./languages.ts";

const greeting = () =>
  defineMessage({
    id: "test.greeting",
    kind: "text",
    parameters: Type.Object({ name: Type.String(), count: Type.Number() }, { additionalProperties: false }),
    texts: { en: ({ name, count }) => `${name}: ${count} notes`, es: ({ name, count }) => `${name}: ${count} notas` },
  });
const invoke = (message: ReturnType<typeof greeting>, args: unknown[]): void => {
  Reflect.apply(message.text, null, args);
};
const declare = (definition: unknown): void => {
  Reflect.apply(defineMessage, null, [definition]);
};
describe("messages in the house language", () => {
  it("keeps the id, types its parameters and requires an explicit language", () => {
    const message = greeting();
    expect(languages).toEqual(["en", "es"]);
    expect(message.id).toBe("test.greeting");
    expect(message.text("es", { name: "Franco", count: 2 })).toBe("Franco: 2 notas");
    expect(message.text("en", { name: "Franco", count: 2 })).toBe("Franco: 2 notes");
    expectTypeOf(message.text).parameters.toEqualTypeOf<[Language, { name: string; count: number }]>();
  });
  it("rejects an absent or unsupported language without choosing another", () => {
    const message = greeting();
    expect(() => invoke(message, [])).toThrow("Missing language");
    expect(() => invoke(message, ["pt", { name: "Franco", count: 2 }])).toThrow(
      "Undeclared language · test.greeting · pt",
    );
  });
  it("names a missing parameter and rejects its wrong type or extra parameters", () => {
    const message = greeting();
    expect(() => invoke(message, ["es", { count: 2 }])).toThrow("/name");
    expect(() => invoke(message, ["es", { name: 7, count: 2 }])).toThrow("/name");
    expect(() => invoke(message, ["es", { name: "F", count: 2, extra: true }])).toThrow();
    expect(() => invoke(message, ["es"])).toThrow("Missing parameters");
  });
  it("rejects a missing translation even when the caller bypasses TypeScript", () => {
    expect(() =>
      declare({
        id: "test.missing",
        kind: "text",
        parameters: Type.Object({}),
        texts: {},
      }),
    ).toThrow("test.missing · en");
    expect(() =>
      declare({ id: "test.half", kind: "text", parameters: Type.Object({}), texts: { en: "Hello" } }),
    ).toThrow("Missing translation · test.half · es");
  });
  it("reads independent messages without storing a current language or parameters", () => {
    const first = greeting();
    const second = greeting();
    expect(first.text("es", { name: "A", count: 1 })).toBe("A: 1 notas");
    expect(second.text("es", { name: "B", count: 3 })).toBe("B: 3 notas");
    expect(first.text("es", { name: "C", count: 0 })).toBe("C: 0 notas");
  });
});

it("names missing declaration arguments and rejects empty translations", () => {
  const definition = {
    id: "test.required",
    kind: "text",
    parameters: Type.Object({}),
    texts: { en: "Hello", es: "Hola" },
  };
  for (const key of Object.keys(definition)) {
    const missing = Object.fromEntries(Object.entries(definition).filter(([name]) => name !== key));
    expect(() => declare(missing)).toThrow(key);
  }
  expect(() => declare(undefined)).toThrow("definition");
  expect(() => declare({ ...definition, texts: { en: "Hello", es: undefined } })).toThrow("test.required · es");
  expect(() => declare({ ...definition, texts: { en: " ", es: "Hola" } })).toThrow(
    "Empty translation · test.required · en",
  );
  const empty = defineMessage({
    id: "test.empty",
    kind: "text",
    parameters: Type.Object({}),
    texts: { en: () => "", es: () => "" },
  });
  expect(() => empty.text("es", {})).toThrow("Empty translation");
});
