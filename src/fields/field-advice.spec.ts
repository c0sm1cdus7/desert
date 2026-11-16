import { expect, it } from "vitest";
import { day, money, quantity, text } from "./fields.ts";
import { fieldSeat as seat } from "../../tests/support/field-seat.ts";

for (const kind of ["type", "paste"] as const) {
  it(`keeps the submitted minimum beside a rejected ${kind}`, () => {
    const hands = seat(money("Importe", 1));
    hands.send({ kind: "type", text: "0" });
    hands.send({ kind: "confirm" });
    for (let i = 0; i < 2; i++) {
      hands.send({ kind, text: "x" });
      expect(hands.reasons()).toEqual(["mínimo $ 0,01", "solo números"]);
      expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(false);
    }
    hands.send({ kind: "type", text: "2" });
    expect(hands.reasons()).toEqual([]);
  });
  it(`keeps stops beside a rejected ${kind}`, () => {
    const hands = seat(money("Importe", 1), undefined, answers => (answers[0] === "5" ? "no cinco" : undefined));
    hands.send({ kind: "type", text: "5" });
    hands.send({ kind: "confirm" });
    hands.send({ kind, text: "x" });
    expect(hands.reasons()).toEqual(["no cinco", "solo números"]);
    hands.send({ kind: "type", text: "2" });
    expect(hands.reasons()).toEqual([]);
  });
  it(`explains a full free text after failure, ${kind}`, () => {
    const hands = seat({ ...text("Nombre", "Nombre"), maxLength: 3 });
    hands.send({ kind: "paste", text: "abc" });
    hands.fail("sin conexión");
    hands.send({ kind, text: "d" });
    expect(hands.reasons()).toEqual(["Error sin conexión", "máximo 3 caracteres"]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: "abc" } });
    hands.send({ kind: "erase" });
    expect(hands.reasons()).toEqual([]);
  });
}
for (const [before, rejected] of [
  ["", " "],
  ["a ", " "],
] as const)
  it(`explains a redundant space after ${JSON.stringify(before)}`, () => {
    const hands = seat(text("Nombre", "Nombre"));
    for (const char of before) hands.send({ kind: "type", text: char });
    hands.send({ kind: "type", text: rejected });
    expect(hands.reasons()).toEqual(["sin espacios al principio ni dobles"]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: before } });
    hands.send({ kind: "type", text: "b" });
    expect(hands.reasons()).toEqual([]);
  });
it("keeps the first rejected space in a free text paste until the next edit", () => {
  const hands = seat(text("Nombre", "Nombre"));
  hands.send({ kind: "paste", text: "  a  b  " });
  expect(hands.screen().body).toMatchObject({ entry: { typed: "a b" } });
  expect(hands.reasons()).toEqual(["sin espacios al principio ni dobles"]);
  hands.send({ kind: "type", text: "c" });
  expect(hands.reasons()).toEqual([]);
});

it("a live calendar reason remains beside a rejected key without pressing Enter first", () => {
  const hands = seat(day("Día"));
  hands.send({ kind: "type", text: "31042026" });
  hands.send({ kind: "type", text: "x" });
  expect(hands.reasons()).toEqual(["día inexistente", "solo números"]);
  expect(hands.screen().hints.some(hint => hint.intent === "confirm")).toBe(false);
});

for (const [kind, typed] of [
  ["left", "Anet"],
  ["right", "Ante"],
] as const) {
  it(`${kind} edits a suggested formatted answer and preserves its discarded-key reason`, () => {
    const hands = seat(quantity("Cantidad", 5));
    hands.send({ kind: "type", text: "x" });
    hands.send({ kind });
    expect(hands.reasons()).toEqual(["solo números"]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: "5" } });
    hands.send({ kind: "type", text: "2" });
    expect(hands.reasons()).toEqual([]);
    expect(hands.screen().body).toMatchObject({ entry: { typed: "52" } });
  });
  it(`${kind} edits a restored answer instead of replacing it`, () => {
    const hands = seat(text("Proveedor", "Proveedor"), text("Detalle", "Detalle"));
    hands.send({ kind: "type", text: "Ant" });
    hands.send({ kind: "confirm" });
    hands.send({ kind: "cancel" });
    hands.send({ kind });
    hands.send({ kind: "type", text: "e" });
    expect(hands.screen().body).toMatchObject({ entry: { typed } });
  });
  it(`${kind} preserves the failure and discarded-key reason until the answer is edited`, () => {
    const hands = seat({ ...text("Nombre", "Nombre"), maxLength: 3 });
    hands.send({ kind: "type", text: "abc" });
    hands.fail("sin conexión");
    hands.send({ kind: "type", text: "d" });
    hands.send({ kind });
    expect(hands.reasons()).toEqual(["Error sin conexión", "máximo 3 caracteres"]);
    hands.send({ kind: "erase" });
    expect(hands.reasons()).toEqual([]);
  });
}
