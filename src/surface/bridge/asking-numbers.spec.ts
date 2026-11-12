// A number that is whole and too little says how much its field takes; and it is written as it reads.
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { padded, quantity } from "../../catalogs/fields.ts";
import { asking } from "./asking.ts";
import { formats, padded as paddedMask } from "../masks.ts";

const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const words = { formats: formats(locale), optionalMark: " · opcional" };

describe("a number that is too little", () => {
  it("says what it has to be more than, or the least it takes: never that it is incomplete", () => {
    const many = asking(object({ many: quantity("Cantidad") }), words).next([]);
    expect([many?.lacks?.("0"), many?.lacks?.("")]).toEqual(["mayor a 0", "vacío"]);
    const point = asking(object({ point: padded("Punto de venta", 4) }), words).next([]);
    expect(point?.lacks?.("0")).toBe("mínimo 0001");
  });

  it("is written without a zero before it: a zero written first gives way to the digit after it", () => {
    const { quantity: mask } = formats(locale);
    expect([mask.put("0", "5"), mask.put("10", "0"), mask.put("0", ",")]).toEqual(["5", "100", "0,"]);
    expect([paddedMask(4).value("0"), paddedMask(4).value("12"), paddedMask(4).value("")]).toEqual([0, 12, undefined]);
  });
});
