import { describe, expect, expectTypeOf, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { defineMessage } from "./messages.ts";
import { languages, type Language } from "./languages.ts";

const greeting = () =>
  defineMessage({
    id: "test.greeting",
    kind: "text",
    parameters: Type.Object({ name: Type.String(), count: Type.Number() }, { additionalProperties: false }),
    texts: { es: ({ name, count }) => `${name}: ${count} notas` },
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
    expect(languages).toEqual(["es"]);
    expect(message.id).toBe("test.greeting");
    expect(message.text("es", { name: "Franco", count: 2 })).toBe("Franco: 2 notas");
    expectTypeOf(message.text).parameters.toEqualTypeOf<[Language, { name: string; count: number }]>();
  });
  it("rejects an absent or unsupported language without choosing another", () => {
    const message = greeting();
    expect(() => invoke(message, [])).toThrow("Idioma ausente");
    expect(() => invoke(message, ["en", { name: "Franco", count: 2 }])).toThrow("en");
  });
  it("names a missing parameter and rejects its wrong type or extra parameters", () => {
    const message = greeting();
    expect(() => invoke(message, ["es", { count: 2 }])).toThrow("/name");
    expect(() => invoke(message, ["es", { name: 7, count: 2 }])).toThrow("/name");
    expect(() => invoke(message, ["es", { name: "F", count: 2, extra: true }])).toThrow();
    expect(() => invoke(message, ["es"])).toThrow("Parámetros ausentes");
  });
  it("rejects a missing translation even when the caller bypasses TypeScript", () => {
    expect(() =>
      declare({
        id: "test.missing",
        kind: "text",
        parameters: Type.Object({}),
        texts: {},
      }),
    ).toThrow("test.missing · es");
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
  const definition = { id: "test.required", kind: "text", parameters: Type.Object({}), texts: { es: "Hola" } };
  for (const key of Object.keys(definition)) {
    const missing = Object.fromEntries(Object.entries(definition).filter(([name]) => name !== key));
    expect(() => declare(missing)).toThrow(key);
  }
  expect(() => declare(undefined)).toThrow("definition");
  expect(() => declare({ ...definition, texts: { es: undefined } })).toThrow("test.required · es");
  expect(() => declare({ ...definition, texts: { es: " " } })).toThrow("Traducción vacía");
  const empty = defineMessage({
    id: "test.empty",
    kind: "text",
    parameters: Type.Object({}),
    texts: { es: () => "" },
  });
  expect(() => empty.text("es", {})).toThrow("Traducción vacía");
});
