// A number that is whole and too little says how much its field takes; and it is written as it reads.
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { day, money, padded, quantity } from "../../catalogs/fields.ts";
import { asking } from "./asking.ts";
import { formats, padded as paddedMask } from "../masks.ts";

const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const words = {
  now: () => Date.UTC(2026, 10, 11),
  today: () => "2026-11-11",
  formats: formats(locale),
  optionalMark: " · opcional",
};

describe("a number being written", () => {
  it("keeps extendable numeric prefixes quiet and unavailable", () => {
    const many = asking(object({ many: quantity("Cantidad") }), words).next([]);
    expect([many?.wrong?.("0"), many?.wrong?.("")]).toEqual([undefined, undefined]);
    const point = asking(object({ point: padded("Punto de venta", 4) }), words).next([]);
    expect(["0", "00", "000"].map(value => point?.wrong?.(value))).toEqual([undefined, undefined, undefined]);
    expect([many?.valid?.("0"), point?.valid?.("0")]).toEqual([false, false]);
  });

  it("says the maximum for a complete out-of-range number, while an empty amount stays quiet", () => {
    const capped = Type.Integer({ title: "Días", minimum: 1, maximum: 60, mask: "padded", width: 2 });
    const days = asking(object({ days: capped }), words).next([]);
    expect([days?.wrong?.("99"), days?.wrong?.("60")]).toEqual(["máximo 60", undefined]);
    const amount = asking(object({ amount: money("Importe", 1) }), words).next([]);
    expect(amount?.wrong?.("")).toBeUndefined();
  });

  it("keeps an incomplete day quiet", () => {
    const due = asking(object({ on: day("Vence") }), words).next([]);
    expect(due?.wrong?.("1")).toBeUndefined();
  });

  it("says the lower bound once no further digit fits the numeric shape", () => {
    const many = asking(object({ many: quantity("Cantidad") }), words).next([]);
    expect(many?.wrong?.("0,000")).toBe("mayor a 0");
    const capped = Type.Integer({ title: "Días", minimum: 200, maximum: 999, mask: "padded", width: 3 });
    const days = asking(object({ days: capped }), words).next([]);
    expect([days?.wrong?.("1"), days?.wrong?.("10"), days?.wrong?.("100")]).toEqual([
      undefined,
      undefined,
      "mínimo 200",
    ]);
  });

  it("is written without a zero before it: a zero written first gives way to the digit after it", () => {
    const { quantity: mask } = formats(locale);
    expect([mask.put("0", "5"), mask.put("10", "0"), mask.put("0", ",")]).toEqual(["5", "100", "0,"]);
    expect([paddedMask(4).value("0"), paddedMask(4).value("12"), paddedMask(4).value("")]).toEqual([0, 12, undefined]);
  });
});
