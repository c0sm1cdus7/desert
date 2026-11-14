import { describe, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { day, holding, when, wrongIn } from "./fields.ts";
import { object } from "./acts.ts";
import { asking } from "../surface/bridge/asking.ts";
import { formats } from "../surface/masks.ts";

const words = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  formats: formats({ currency: "$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }),
};
describe("holding preserves the field's own reasons", () => {
  for (const extended of [false, true]) {
    for (const value of ["2026-02-30", "2026-04-31", "2025-02-29", "2026-13-01", "2026-01-00"])
      it(`${value}, added reason: ${extended}`, () => {
        const base = day("Día");
        const field = extended ? holding(base, () => "motivo del programa") : base;
        expect(wrongIn(field, value, 17)).toBe("día inexistente");
        const question = asking(object({ date: field }), words).next([]);
        expect(question?.wrong?.(value.split("-").reverse().join(""))).toBe("día inexistente");
      });
  }
  it("only asks the added rule after the base accepts, preserving the instant and the original field", () => {
    const added = vi.fn((value: string, at: number) => (value === "2024-02-29" && at === 17 ? "cerrado" : undefined));
    const base = day("Día");
    const field = holding(holding(base, added), () => "segundo motivo");
    expect(wrongIn(field, "2026-02-30", 17)).toBe("día inexistente");
    expect(added).not.toHaveBeenCalled();
    expect(wrongIn(field, "2024-02-29", 17)).toBe("cerrado");
    expect(wrongIn(field, "2026-02-28", 17)).toBe("segundo motivo");
    expect(wrongIn(base, "2024-02-29", 17)).toBeUndefined();
  });
  it("still says future day in an action with last today", () => {
    const field = holding(day("Día", undefined, "today"), () => undefined);
    expect(
      asking(object({ date: field }), words)
        .next([])
        ?.wrong?.("14112026"),
    ).toBe("día futuro");
  });
  it("accepts real leap days with and without an added reason", () => {
    for (const field of [day("Día"), holding(day("Día"), () => undefined)]) {
      expect(wrongIn(field, "2024-02-29", 17)).toBeUndefined();
      expect(
        asking(object({ date: field }), words)
          .next([])
          ?.wrong?.("29022024"),
      ).toBeUndefined();
    }
  });
  it("preserves the reason through optional, conditional, array and union fields", () => {
    const date = holding(day("Día"), () => undefined);
    const fields = [Type.Optional(date), when(date, () => true)];
    for (const field of fields) expect(wrongIn(field, "2026-04-31", 17)).toBe("día inexistente");
    const schema = object({ dates: Type.Array(Type.Union([date, Type.Literal("nada")])) });
    expect(wrongIn(schema, { dates: ["2024-02-29", "2026-04-31"] }, 17)).toBe("día inexistente");
    expect(wrongIn(object({ date: Type.Optional(date) }), {}, 17)).toBeUndefined();
  });
});
