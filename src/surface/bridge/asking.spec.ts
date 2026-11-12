// The questions of an act, asked from what it declares it takes: every kind of field, both ways.
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import {
  count,
  day,
  digits,
  many,
  money,
  oneOf,
  option,
  quantity,
  text,
  usually,
  when,
} from "../../catalogs/fields.ts";
import { formats, limited, padded, shaped } from "../masks.ts";
import { asking } from "./asking.ts";

const words = {
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
  optionalMark: " (opcional)",
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

  it("does not take zero where nothing is not an amount: a price, a payment", () => {
    const ask = asking(object({ price: money("Precio", 1), tip: money("Propina") }), words);
    const valid = (given: readonly string[], typed: string) => ask.next(given)?.valid?.(typed);
    expect([valid([], ""), valid([], "0"), valid([], "1")]).toEqual([false, false, true]);
    expect(valid(["1"], "0")).toBe(true);
  });

  it("takes in a field only what its declaration takes, and nothing in an optional one is an answer", () => {
    const ask = asking(order, words);
    const valid = (given: number, typed: string) => ask.next(answers.slice(0, given))?.valid?.(typed);
    /** A day the calendar does not have is whole and wrong: its field says why (see asking-days.spec.ts). */
    expect([valid(1, "30022026"), valid(1, "0111"), valid(1, "01112026")]).toEqual([true, false, true]);
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
    /** What a person writes has a top: a text says how long it may be, and a number how much. */
    const endless = Type.String({ title: "Nombre", placeholder: "Nombre" });
    expect(refused(object({ what: endless }))).toThrow("The field Nombre does not say how long it may be");
    const topless = Type.Integer({ minimum: 0, title: "Monto", mask: "money" });
    expect(refused(object({ what: topless }))).toThrow("The field Monto has no top");
    const spoken = Type.String({ title: "Qué vendés", placeholder: "Nombre" });
    expect(refused(object({ what: spoken }))).toThrow("A question speaks to who reads it: Qué vendés");
  });
});

describe("a datum with a shape of its own", () => {
  it("fills one shape as it is typed, and takes nothing but digits", () => {
    const cuit = shaped(["##-########-#"]);
    const typed = ["", "20", "201", "20123456786"].map(digits_ => cuit.shown(digits_));
    expect([cuit.empty, ...typed]).toEqual(["00-00000000-0", "", "20", "20-1", "20-12345678-6"]);
    expect([cuit.put("20", "a"), cuit.put("20", "1"), cuit.put("20123456786", "9")]).toEqual([
      "20",
      "201",
      "20123456786",
    ]);
    expect([cuit.value("2012"), cuit.value("20123456786")]).toEqual([undefined, "20123456786"]);
  });
  it("tells several shapes apart by how many digits there are, and shows one once the count is its own", () => {
    const document = shaped(["#.###.###", "##.###.###", "##-########-#"]);
    const typed = ["5123456", "30111222", "301112223", "20123456786"].map(digits_ => document.shown(digits_));
    expect(typed).toEqual(["5.123.456", "30.111.222", "301112223", "20-12345678-6"]);
    expect(document.empty).toBe("0.000.000 · 00.000.000 · 00-00000000-0");
  });
  it("writes a number with zeros before it, from the right; and a name with only the characters it allows", () => {
    const point = padded(4);
    expect([point.empty, point.shown(point.put("", "1")), point.put("1234", "5")]).toEqual(["0000", "0001", "1234"]);
    expect([point.value("0"), point.value("12")]).toEqual([undefined, 12]);
    const user = limited("a-z0-9._-", 8, "nombre");
    const put = [user.put("ana", "A"), user.put("ana", "."), user.put("abcdefgh", "i")];
    expect([user.empty, ...put]).toEqual(["nombre", "ana", "ana.", "abcdefgh"]);
  });
  it("is asked with its mask, and is refused when declared as free text with a pattern", () => {
    const asked = asking(object({ cuit: digits("CUIT", "##-########-#") }), words).next([]);
    expect(asked).toMatchObject({ ask: "CUIT", kind: "text", mask: { empty: "00-00000000-0" } });
    const free = Type.String({ pattern: "^\\d{11}$", title: "CUIT", placeholder: "11 números" });
    expect(() => asking(object({ cuit: free }), words)).toThrow("The field CUIT has a shape and no mask");
  });
});

describe("a field that is asked only when what came before calls for it", () => {
  const kinds = oneOf("Tipo", option("cuit", "CUIT", "c"), option("cuil", "CUIL", "l"));
  const elevens = ({ number }: Readonly<Record<string, unknown>>): boolean => String(number).length === 11;
  const document = object({
    number: digits("Documento", "##.###.###", "##-########-#"),
    kind: when(kinds, elevens),
    name: text("Nombre", "Nombre"),
  });
  const ask = asking(document, words);

  it("is not asked, and the datum goes without it, while what was answered does not call for it", () => {
    expect(ask.next(["12345678"])?.ask).toBe("Nombre");
    expect(ask.input(["12345678", "Ana"])).toEqual({ number: "12345678", name: "Ana" });
    expect(ask.answers({ number: "12345678", name: "Ana" })).toEqual(["12345678", "Ana"]);
  });

  it("is asked right after the answer that calls for it, and read back the same way", () => {
    expect(ask.next(["20123456786"])?.ask).toBe("Tipo");
    expect(ask.input(["20123456786", "CUIL", "Ana"])).toEqual({ number: "20123456786", kind: "cuil", name: "Ana" });
    expect(ask.answers({ number: "20123456786", kind: "cuil", name: "Ana" })).toEqual(["20123456786", "CUIL", "Ana"]);
    expect(ask.sofar(["20123456786", "CUIL"])).toEqual({ number: "20123456786", kind: "cuil" });
  });
});

describe("a day that is usually today", () => {
  const since = object({ from: day("Desde", "today"), to: day("Hasta") });

  it("opens on today as the program's country counts it, and on nothing where nobody says what today is", () => {
    const told = asking(since, { ...words, today: () => "2026-11-11" });
    expect(told.next([])?.initial).toBe("11112026");
    expect(told.next(["2026-11-11"])?.initial).toBeUndefined();
    expect(asking(since, words).next([])?.initial).toBeUndefined();
  });
});
