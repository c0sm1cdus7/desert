import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { count, day, digits, handle, money, padded, quantity } from "./fields.ts";
import { fieldSeat as seat } from "../../tests/support/field-seat.ts";

describe("Enter explains an extendable value below the minimum", () => {
  for (const [field, reason] of [
    [money("Importe", 1), "mínimo $ 0,01"],
    [quantity("Cantidad"), "mayor a 0"],
    [count("Cuenta"), "mínimo 1"],
    [padded("Punto", 4), "mínimo 0001"],
  ] as const) {
    it(String(field.mask), () => {
      const hands = seat(field);
      hands.send({ kind: "type", text: "0" });
      expect(hands.reasons()).toEqual([]);
      hands.send({ kind: "confirm" });
      expect(hands.reasons()).toEqual([reason]);
      hands.send({ kind: "confirm" });
      expect(hands.reasons()).toEqual([reason]);
      hands.send({ kind: "type", text: "1" });
      expect(hands.reasons()).toEqual([]);
      expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(true);
    });
    it(`${field.mask}: optional empty still means nothing`, () => {
      const hands = seat(Type.Optional(field));
      hands.send({ kind: "confirm" });
      expect(hands.reasons()).toEqual([]);
      expect(hands.session().at(-1)).toMatchObject({ phase: "running", answers: [""] });
    });
  }
});
describe("ignored keys explain themselves, once, including pasted text", () => {
  const samples = [
    { field: money("Importe"), before: "1", bad: "x", why: "solo números", next: "2" },
    { field: quantity("Cantidad"), before: "", bad: "-", why: "sin signo", next: "5" },
    { field: count("Cuenta"), before: "1", bad: " ", why: "sin espacios", next: "2" },
    { field: padded("Punto", 2), before: "12", bad: "3", why: "máximo 99", next: "3" },
    { field: day("Día"), before: "1", bad: "x", why: "solo números", next: "2" },
    { field: digits("Código", "##"), before: "12", bad: "3", why: "máximo 2 dígitos", next: "3" },
    { field: handle("Nombre", "Nombre", "a-z", 8), before: "a", bad: " ", why: "sin espacios", next: "b" },
    { field: quantity("Cantidad"), before: "123456", bad: "7", why: "máximo 999999", next: "7" },
    { field: quantity("Cantidad"), before: "1,234", bad: "5", why: "máximo 3 decimales", next: "5" },
    {
      field: quantity("Cantidad"),
      before: "1,2",
      bad: ",",
      why: "un separador decimal, después del número",
      next: "3",
    },
    { field: handle("Nombre", "Nombre", "a-z", 2), before: "ab", bad: "c", why: "máximo 2 caracteres", next: "c" },
    { field: handle("Nombre", "Nombre", "a-z", 8), before: "a", bad: "!", why: "carácter no permitido", next: "b" },
  ];
  for (const sample of samples)
    for (const kind of ["type", "paste"] as const)
      it(`${sample.field.mask}: ${sample.why}, ${kind}`, () => {
        const hands = seat(sample.field);
        hands.send({ kind: "type", text: sample.before });
        const before = hands.screen().body;
        hands.send({ kind, text: sample.bad });
        expect(hands.reasons()).toEqual(kind === "paste" && sample.bad.trim() === "" ? [] : [sample.why]);
        hands.send({ kind, text: sample.bad });
        expect(hands.reasons()).toEqual(kind === "paste" && sample.bad.trim() === "" ? [] : [sample.why]);
        const after = hands.screen().body;
        expect(after.kind === "thread" && after.entry).toEqual(before.kind === "thread" && before.entry);
        hands.send({ kind: "erase" });
        hands.send({ kind: "type", text: sample.next });
        expect(hands.reasons()).toEqual([]);
      });
  for (const [field, text, typed, why] of [
    [handle("Nombre", "Nombre", "a-z", 8), "a b", "ab", "sin espacios"],
    [quantity("Cantidad"), "-5", "5", "sin signo"],
    [quantity("Cantidad"), "1234567", "123456", "máximo 999999"],
    [quantity("Cantidad"), "-5x", "5", "sin signo"],
  ] as const)
    it(`whole paste ${text}`, () => {
      const hands = seat(field);
      hands.send({ kind: "paste", text });
      expect(hands.reasons()).toEqual([why]);
      expect(hands.screen().body).toMatchObject({ entry: { typed } });
    });
});
describe("neighboring edits", () => {
  for (const field of [money("Importe"), count("Cuenta"), quantity("Cantidad"), padded("Punto", 2)])
    it(`${field.mask}: a repeated zero preserves prior advice and explains the discarded zero`, () => {
      const hands = seat(field);
      hands.send({ kind: "type", text: "0x" });
      expect(hands.reasons()).toEqual(["solo números"]);
      const before = hands.screen().body;
      hands.send({ kind: "type", text: "0" });
      expect(hands.reasons()).toEqual(["solo números", "cero inicial descartado"]);
      expect(hands.screen().body).toMatchObject({ entry: before.kind === "thread" ? before.entry : undefined });
      hands.send({ kind: "type", text: "1" });
      expect(hands.reasons()).toEqual([]);
    });
  it("an ignored key preserves the suggested value until an accepted edit", () => {
    const hands = seat(quantity("Cantidad", 5));
    hands.send({ kind: "type", text: "x" });
    expect(hands.reasons()).toEqual(["solo números"]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: "5", suggested: true } });
    hands.send({ kind: "type", text: "2" });
    expect(hands.reasons()).toEqual([]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: "2" } });
  });
  it("an ignored key cannot make an invalid amount run; a corrected amount can", () => {
    const hands = seat(money("Importe", 1));
    hands.send({ kind: "paste", text: "-0" });
    expect(hands.reasons()).toEqual(["sin signo"]);
    hands.send({ kind: "confirm" });
    expect(hands.reasons()).toEqual(["mínimo $ 0,01"]);
    expect(hands.session().at(-1)).toMatchObject({ phase: "asking" });
    hands.send({ kind: "type", text: "1" });
    hands.send({ kind: "confirm" });
    expect(hands.session().at(-1)).toMatchObject({ phase: "running", answers: ["1"] });
  });
});
