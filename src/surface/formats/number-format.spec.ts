// Las reglas aceptan husos negativos y umbrales numéricos completos desde el formulario real.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { asking } from "../bridge/questions/asking.ts";
import { formats } from "./masks.ts";
const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
it("escribe números con signo, decimales y exponentes sin aceptar prefijos incompletos", () => {
  const mask = formats(locale).number;
  for (const value of [-180, 0, -1.25, 1e-10, 9007199254740991]) {
    const typed = Array.from(mask.typed(value)).reduce((text, char) => mask.put(text, char), "");
    expect(mask.value(typed)).toBe(value);
  }
  for (const incomplete of ["", "-", "1e", "1e-", "Infinity", "NaN", "1e999"])
    expect(mask.value(incomplete)).toBeUndefined();
  expect(mask.rejected?.("12", "x")).toBeDefined();
});
it("el lector devuelve el número tipado y respeta los límites del horario", () => {
  const reader = asking(
    object({
      offset: Type.Integer({
        title: "Huso en minutos",
        mask: "number",
        minimum: -840,
        maximum: 840,
      }),
    }),
    { formats: formats(locale), now: () => 0, today: () => "2026-11-18", optionalMark: " · opcional" },
  );
  const field = reader.next([]);
  expect(field?.valid?.("-180")).toBe(true);
  expect(field?.valid?.("-841")).toBe(false);
  expect(reader.input(["-180"])).toEqual({ offset: -180 });
});
