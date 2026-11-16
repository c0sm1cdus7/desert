import { OutsideDefect } from "./program-call.ts";
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { object } from "./visible-text.ts";
import { many, money, oneOf, option, when } from "./fields.ts";
import { asking } from "../surface/bridge/questions/asking.ts";
import { formats } from "../surface/formats/masks.ts";
import { maskOf } from "../surface/session/screen.ts";

const words = {
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
  optionalMark: "",
  now: () => 17,
  today: () => "2026-11-13",
};
const currency = oneOf("Moneda", option("ARS", "Pesos", "p"), option("USD", "Dólares", "d"));
const symbol = (answered: Readonly<Record<string, unknown>>) => (answered.currency === "USD" ? "US$" : "$");
const amount = money("Importe", 1, symbol);
const sale = object({ currency, amount });

describe("money declares its currency without changing cents", () => {
  it("uses an earlier answer in the empty field, typing, limits and echoed answer", () => {
    const ask = asking(sale, words);
    const field = ask.next(["Dólares"]);
    expect(field).toMatchObject({ mask: { empty: "US$ 0,00" } });
    expect(maskOf(field, "1005")).toBe("US$ 10,05");
    expect(field?.wrong?.("0", true)).toBe("mínimo US$ 0,01");
    expect(ask.input(["Dólares", "1005"])).toEqual({ currency: "USD", amount: 1005 });
    expect(ask.answers({ currency: "USD", amount: 1005 })).toEqual(["Dólares", "1005"]);
  });
  it.each(["Precio unitario con IVA", "Costo de envío", "Descuento · importe", "Cobro", "Nota de crédito"])(
    "%s has the declared currency and preserves cents",
    title => {
      const ask = asking(object({ currency, amount: money(title, 0, symbol) }), words);
      const field = ask.next(["Dólares"]);
      expect(field).toMatchObject({ ask: title, mask: { empty: "US$ 0,00" } });
      expect(maskOf(field, "1005")).toBe("US$ 10,05");
      expect(ask.input(["Dólares", "1005"])).toEqual({ currency: "USD", amount: 1005 });
    },
  );
  it("uses the country when omitted or unresolved, and keeps other locales' separators", () => {
    const ask = asking(object({ amount: money("Importe") }), words);
    expect(maskOf(ask.next([]), "123456")).toBe("$ 1.234,56");
    const fallback = asking(object({ amount: money("Importe", 0, () => undefined) }), words);
    expect(maskOf(fallback.next([]), "0")).toBe("$ 0,00");
    const other = asking(object({ amount: money("Importe", 0, "US$") }), {
      ...words,
      formats: formats({ currency: "€", thousands: ",", decimal: ".", day: "dd/mm/yyyy" }),
    });
    expect(maskOf(other.next([]), "123456")).toBe("US$ 1,234.56");
  });
  it("has no shared currency between simultaneous questions", () => {
    const ask = asking(sale, words);
    const dollars = ask.next(["Dólares"]);
    const pesos = ask.next(["Pesos"]);
    expect(maskOf(pesos, "100")).toBe("$ 1,00");
    expect(maskOf(dollars, "100")).toBe("US$ 1,00");
    expect(maskOf(ask.next(["Dólares"]), "100")).toBe("US$ 1,00");
  });
  it("keeps optional empty, zero, maximum and old persisted cents", () => {
    const ask = asking(object({ amount: Type.Optional(money("Importe", 0, "US$")) }), words);
    expect(ask.input([""])).toEqual({});
    expect(ask.next([])?.valid?.("")).toBe(true);
    expect(ask.input(["0"])).toEqual({ amount: 0 });
    expect(ask.input(["9999999999999"])).toEqual({ amount: 9999999999999 });
    expect(ask.answers({ amount: 5000 })).toEqual(["5000"]);
  });
  it("carries earlier answers into nested records, arrays and discriminated shapes", () => {
    const nested = asking(object({ currency, item: object({ amount }) }), words);
    expect(maskOf(nested.next(["Dólares"]), "100")).toBe("US$ 1,00");
    const listed = asking(
      object({
        currency,
        items: many(object({ amount }), {
          ask: "Otro",
          done: { title: "Listo", key: "l" },
          another: { title: "Otro", key: "o" },
        }),
      }),
      words,
    );
    expect(maskOf(listed.next(["Dólares", "100", "Otro"]), "200")).toBe("US$ 2,00");
    const shapes = asking(
      oneOf(
        "Moneda",
        object({ currency: option("USD", "Dólares", "d"), amount }),
        object({ currency: option("ARS", "Pesos", "p"), amount }),
      ),
      words,
    );
    expect(maskOf(shapes.next(["Dólares"]), "100")).toBe("US$ 1,00");
    const conditional = asking(
      object({ currency, amount: when(amount, symbolAnswer => symbol(symbolAnswer) === "US$") }),
      words,
    );
    expect(maskOf(conditional.next(["Dólares"]), "100")).toBe("US$ 1,00");
    expect(conditional.next(["Pesos"])).toBeNull();
  });
});

// Literal declarations are checked at composition; computed symbols are checked with their real context.
describe("a currency symbol has a bounded shape", () => {
  for (const symbol of [
    "",
    " ",
    " US$",
    "US$ ",
    "Dólares estadounidenses",
    "123456789",
    "U\nS",
    "U\rS",
    "U\tS",
    "\u001b[31mX",
    "U\u2028S",
    "U\u2029S",
    "U\u200bS",
  ])
    it(JSON.stringify(symbol), () => {
      expect(() => asking(object({ amount: money("Importe", 1, symbol) }), words)).toThrow(
        "Símbolo de moneda inválido",
      );
      const ask = asking(object({ amount: money("Importe", 1, () => symbol) }), words);
      expect(() => ask.next([])).toThrow("Símbolo de moneda inválido");
    });
  it.each(["$", "US$", "€", "12345678"])("accepts %s", symbol => {
    expect(asking(object({ amount: money("Importe", 1, symbol) }), words).next([])?.currency).toBe(symbol);
  });
});

it("a currency resolver returning a non-string fails at the program boundary", () => {
  const ask = asking(object({ amount: { ...money("Importe"), currency: () => 123 } }), words);
  expect(() => ask.next([])).toThrow(OutsideDefect);
  expect(() => ask.next([])).toThrow(/Importe.*123/u);
});

it.each(["", " US$", "US$ ", "123456789", "U\nS", "\u001b[31mX"])(
  "rejects an invalid country currency at composition: %s",
  currency => {
    expect(() => formats({ currency, decimal: ",", thousands: ".", day: "dd/mm/aaaa" })).toThrow(
      "Símbolo de moneda inválido",
    );
  },
);
