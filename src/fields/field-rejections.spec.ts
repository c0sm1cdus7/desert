import { describe, expect, it } from "vitest";
import { said } from "./phrases.ts";
import { count, day, handle, money, quantity } from "./fields.ts";
import { limited } from "../surface/formats/masks.ts";
import { fieldSeat as seat } from "../../tests/support/field-seat.ts";

describe("a rejected key adds advice without erasing an action failure", () => {
  for (const kind of ["type", "paste"] as const)
    it(kind, () => {
      const hands = seat(money("Importe", 1));
      hands.send({ kind: "type", text: "5" });
      hands.fail("sin conexión");
      const before = hands.screen();
      if (before.body.kind !== "thread") throw new Error("Not a question");
      for (let attempt = 0; attempt < 2; attempt++) {
        hands.send({ kind, text: "x" });
        expect(hands.screen()).toEqual({
          ...before,
          body: {
            ...before.body,
            events: [
              ...before.body.events,
              { text: [{ text: "solo números", tone: "t3" }], nested: true, ignored: true },
            ],
          },
        });
      }
      hands.send({ kind: "type", text: "2" });
      expect(hands.reasons()).toEqual([]);
      hands.fail("sin conexión");
      expect(hands.reasons()).toEqual(["Error sin conexión"]);
      hands.send({ kind: "paste", text: "x3" });
      expect(hands.reasons()).toEqual(["solo números"]);
      hands.send({ kind: "erase" });
      expect(hands.reasons()).toEqual([]);
    });
});

describe("the reason belongs to the first rejected character after trimming the paste", () => {
  it("an allowed space in a full phone field exceeds the limit", () => {
    const mask = limited("0-9 +()-", 5, "Teléfono");
    expect(said(mask.rejected?.("12345", " ") ?? "", "es")).toBe("máximo 5 caracteres");
    const hands = seat(handle("Teléfono", "Teléfono", "0-9 +()-", 5));
    hands.send({ kind: "type", text: "12345 " });
    expect(hands.reasons()).toEqual(["máximo 5 caracteres"]);
    hands.send({ kind: "erase" });
    hands.send({ kind: "type", text: " " });
    expect(hands.reasons()).toEqual([]);
  });
  for (const [field, paste, typed, reasons] of [
    [count("Cuenta"), "123\n", "123", []],
    [quantity("Cantidad"), "  12,5  ", "12,5", []],
    [count("Cuenta"), " 12a", "12", ["solo números"]],
    [count("Cuenta"), " \n12a- \n", "12", ["solo números"]],
    [count("Cuenta"), " \n-12a \n", "12", ["sin signo"]],
    [handle("Nombre", "Nombre", "a-z", 8), " ab ", "ab", []],
    [handle("Nombre", "Nombre", "a-z", 8), " a! b ", "ab", ["carácter no permitido"]],
    [handle("Nombre", "Nombre", "a-z", 8), " a !b ", "ab", ["sin espacios"]],
    [count("Cuenta"), "1\n2", "12", ["sin espacios"]],
    [handle("Teléfono", "Teléfono", "0-9 +()-", 5), "12345 6", "12345", ["máximo 5 caracteres"]],
  ] as const)
    it(JSON.stringify(paste), () => {
      const hands = seat(field);
      hands.send({ kind: "paste", text: paste });
      expect(hands.screen().body).toMatchObject({ entry: { typed } });
      expect(hands.reasons()).toEqual(reasons);
    });
  it("whitespace-only paste preserves a failed action and its value", () => {
    const hands = seat(money("Importe", 1));
    hands.send({ kind: "type", text: "5" });
    hands.fail("sin conexión");
    const before = hands.screen();
    hands.send({ kind: "paste", text: " \n\t " });
    expect(hands.screen()).toEqual(before);
  });
});

describe("calendar reasons precede future bounds", () => {
  for (const value of ["30022027", "31042027", "29022027", "00122027", "01132027"])
    it(value, () => {
      const hands = seat(day("Día", undefined, "today"));
      hands.send({ kind: "type", text: value });
      expect(hands.reasons()).toEqual(["día inexistente"]);
      hands.send({ kind: "confirm" });
      expect(hands.reasons()).toEqual(["día inexistente"]);
    });
  for (const value of ["28022027", "29022028"])
    it(`real future ${value}`, () => {
      const hands = seat(day("Día", undefined, "today"));
      hands.send({ kind: "type", text: value });
      expect(hands.reasons()).toEqual(["día futuro"]);
    });
});

it("advice stays in its question across advance, back, retry, cancellation and reopening", () => {
  const hands = seat(money("Importe", 1), count("Cuenta"));
  hands.send({ kind: "type", text: "1x" });
  expect(hands.reasons()).toEqual(["solo números"]);
  hands.send({ kind: "confirm" });
  expect(hands.reasons()).toEqual([]);
  hands.send({ kind: "type", text: "2x" });
  hands.send({ kind: "cancel" });
  expect(hands.reasons()).toEqual([]);
  expect(hands.screen().body).toMatchObject({ entry: { typed: "$ 0,01", suggested: true } });
  hands.send({ kind: "confirm" });
  hands.send({ kind: "type", text: "2" });
  hands.fail("sin conexión");
  hands.send({ kind: "type", text: "x" });
  expect(hands.reasons()).toEqual(["Error sin conexión", "solo números"]);
  expect(hands.send({ kind: "confirm" })).toMatchObject({ answers: ["1", "2"] });
  expect(hands.reasons()).toEqual([]);
  hands.send({ kind: "cancel" });
  expect(hands.session().at(-1)).toMatchObject({ kind: "menu" });
  hands.reopen();
  expect(hands.reasons()).toEqual([]);
  expect(hands.screen().body).toMatchObject({ entry: { typed: "" } });
});
