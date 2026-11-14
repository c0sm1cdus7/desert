import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { count, day, digits, handle, money, padded, quantity, text } from "../catalogs/fields.ts";
import { fieldSeat as seat } from "../../tests/support/field-seat.ts";

describe("every invalid submitted field explains why", () => {
  for (const field of [
    money("Importe", 1),
    quantity("Cantidad"),
    count("Cuenta"),
    padded("Punto", 4),
    day("Día"),
    digits("Código", "##-##"),
    text("Nombre", "Nombre"),
    handle("Usuario", "Usuario", "a-z", 8),
  ]) {
    it(`${field.title}: required empty is quiet until Enter and explains what is missing`, () => {
      const hands = seat(field);
      expect(hands.reasons()).toEqual([]);
      expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(false);
      for (let attempt = 0; attempt < 2; attempt++) {
        hands.send({ kind: "confirm" });
        expect(hands.reasons()).toEqual(["falta completar"]);
        expect(hands.session().at(-1)).toMatchObject({ phase: "asking" });
      }
      hands.send({ kind: "type", text: field.title === "Usuario" || field.title === "Nombre" ? "a" : "1" });
      expect(hands.reasons()).toEqual([]);
      hands.reopen();
      expect(hands.reasons()).toEqual([]);
    });
    it(`${field.title}: optional empty can still run`, () => {
      const hands = seat(Type.Optional(field));
      expect(hands.send({ kind: "confirm" })).toMatchObject({ answers: [""] });
      expect(hands.reasons()).toEqual([]);
    });
  }
  for (const [field, prefix, why, rest] of [
    [day("Día"), "1302", "día incompleto", "2026"],
    [digits("Código", "##-##", "###-###"), "12", "dígitos incompletos", "34"],
    [{ ...text("Nombre", "Nombre"), minLength: 3 }, "ab", "mínimo 3 caracteres", "c"],
    [{ ...handle("Usuario", "Usuario", "a-z", 8), minLength: 3 }, "ab", "mínimo 3 caracteres", "c"],
  ] as const)
    for (const optional of [false, true])
      it(`${field.title}: incomplete ${optional ? "optional" : "required"} waits for Enter`, () => {
        const hands = seat(optional ? Type.Optional(field) : field);
        hands.send({ kind: "type", text: prefix });
        expect(hands.reasons()).toEqual([]);
        hands.send({ kind: "confirm" });
        expect(hands.reasons()).toEqual([why]);
        expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(false);
        hands.send({ kind: "type", text: rest });
        expect(hands.reasons()).toEqual([]);
        expect(hands.send({ kind: "confirm" })).toBeDefined();
      });
});

it("explains a complete text with a declared pattern that it does not match", () => {
  const hands = seat({ ...text("Nombre", "Nombre"), pattern: "^[a-z]+$" });
  hands.send({ kind: "type", text: "123" });
  expect(hands.reasons()).toEqual([]);
  hands.send({ kind: "confirm" });
  expect(hands.reasons()).toEqual(["formato inválido"]);
  expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(false);
});
