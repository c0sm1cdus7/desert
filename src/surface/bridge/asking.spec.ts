// The questions of an act, asked from what it declares it takes: every kind of field, both ways.
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { count, day, many, money, oneOf, option, quantity, text, usually } from "../../catalogs/fields.ts";
import { formats } from "../masks.ts";
import { asking } from "./asking.ts";

const words = {
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
  optionalMark: " (opcional)",
  noneMark: "Ninguno",
};
const more = { ask: "Artículos", done: { title: "Listo", key: "l" }, another: { title: "Otro", key: "o" } };
const line = object({ what: text("Artículo {n}", "Qué es"), amount: quantity("Cantidad", 1), price: money("Precio") });
const kind = oneOf(
  "Qué se vende",
  object({ kind: option("goods", "Cosas", "c") }),
  object({ kind: option("service", "Un servicio", "s"), from: day("Desde"), to: day("Hasta") }),
);
const order = object({
  kind,
  lines: many(line, more),
  pay: oneOf("Cómo paga", option("cash", "Efectivo", "e"), option("card", "Tarjeta", "t")),
  copies: count("Copias"),
  buyer: Type.Optional(text("A nombre de", "Nombre")),
});
const told = {
  kind: { kind: "service", from: "2026-11-01", to: "2026-11-30" },
  lines: [
    { what: "Café", amount: 2, price: 450_000 },
    { what: "Filtro", amount: 1.5, price: 35_050 },
  ],
  pay: "card",
  copies: 2,
};
const said = ["Un servicio", "01112026", "30112026", "Café", "2", "450000", "Otro", "Filtro", "1,5", "35050", "Listo"];
const answers = [...said, "Tarjeta", "2", ""];

describe("asking what an act takes", () => {
  it("says a datum as the answers a person gives, and reads those answers back as the same datum", () => {
    const ask = asking(order, words);
    expect(ask.answers(told)).toEqual(answers);
    expect(ask.input(answers)).toEqual(told);
    expect(ask.taken([...answers, "extra"])).toBe(answers.length);
    expect(ask.input([...answers.slice(0, -1), "Juan"])).toEqual({ ...told, buyer: "Juan" });
  });

  it("asks one question at a time, each as its field declares it", () => {
    const ask = asking(order, words);
    const asked = (given: number) => ask.next(answers.slice(0, given));
    expect(asked(0)).toMatchObject({ ask: "Qué se vende", kind: "one", options: [{ key: "c" }, { key: "s" }] });
    expect(asked(1)).toMatchObject({ ask: "Desde", kind: "text", mask: { empty: "dd/mm/aaaa" } });
    expect(asked(3)).toEqual(expect.objectContaining({ ask: "Artículo 1", kind: "text", placeholder: "Qué es" }));
    expect(asked(4)).toMatchObject({ ask: "Cantidad", initial: "1", mask: { empty: "0" } });
    expect(asked(5)).toMatchObject({ ask: "Precio", mask: { empty: "$ 0,00" } });
    expect(asked(6)).toMatchObject({ ask: "Artículos", kind: "one", options: [more.done, more.another] });
    expect(asked(7)).toMatchObject({ ask: "Artículo 2" });
    expect(asked(11)).toMatchObject({ ask: "Cómo paga", options: [{ title: "Efectivo" }, { title: "Tarjeta" }] });
    expect(asked(12)).toMatchObject({ ask: "Copias" });
    expect(asked(13)).toMatchObject({ ask: "A nombre de (opcional)", placeholder: "Nombre" });
    expect(asked(14)).toBeNull();
    expect(ask.next(["Cosas"])).toMatchObject({ ask: "Artículo 1" });
  });

  it("opens a choice on its usual answer, when it has one", () => {
    const rate = usually("IVA", "21", option("10.5", "10,5%", "1"), option("21", "21%", "a"));
    const ask = asking(object({ rate }), words);
    expect(ask.next([])).toMatchObject({ ask: "IVA", kind: "one", initial: "21%" });
    expect(ask.input(["10,5%"])).toEqual({ rate: "10.5" });
  });

  it("takes in a field only what its declaration takes, and nothing in an optional one is an answer", () => {
    const ask = asking(order, words);
    const valid = (given: number, typed: string) => ask.next(answers.slice(0, given))?.valid?.(typed);
    expect([valid(1, "30022026"), valid(1, "0111"), valid(1, "01112026")]).toEqual([false, false, true]);
    expect([valid(4, ""), valid(4, "0"), valid(4, "1,5")]).toEqual([false, false, true]);
    expect([valid(12, "0"), valid(12, "3")]).toEqual([false, true]);
    expect([valid(3, ""), valid(13, "")]).toEqual([false, true]);
  });

  it("refuses, when the program is composed, a declaration with a field that cannot be asked", () => {
    const refused = (schema: Parameters<typeof asking>[0]) => () => asking(schema, words);
    const choice = (...keys: string[]) => keys.map((key, index) => option(`v${index}`, `Opción ${index}`, key));
    expect(refused(object({ name: Type.String() }))).toThrow("does not say its title");
    expect(refused(object({ name: Type.String({ title: "Nombre" }) }))).toThrow("does not say its placeholder");
    expect(refused(object({ total: Type.Number({ title: "Total" }) }))).toThrow("has no format and is not text");
    expect(refused(object({ pay: Type.Union(choice("a", "b")) }))).toThrow("does not say its title");
    const keyless = Type.Literal("card", { title: "Tarjeta" });
    expect(refused(object({ pay: oneOf("Cómo paga", option("cash", "Efectivo", "e"), keyless) }))).toThrow(
      "does not say its key",
    );
    expect(refused(object({ pay: oneOf("Cómo paga", ...choice("a", "a")) }))).toThrow("the same key: a, a");
    expect(refused(object({ lines: Type.Array(line, { minItems: 1 }) }))).toThrow("does not say its ask");
    expect(refused(object({ lines: many(object({ what: Type.String() }), more) }))).toThrow("does not say its title");
    const nested = oneOf("Qué", object({ kind: option("a", "A", "a"), from: Type.String({ title: "Desde" }) }));
    expect(refused(object({ kind: nested }))).toThrow("does not say its placeholder");
    const signed = Type.String({ title: "¿Qué es?", placeholder: "Nombre" });
    expect(refused(object({ what: signed }))).toThrow("A question is a noun, without signs: ¿Qué es?");
  });
});
