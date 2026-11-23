// A day that already happened: one after today is turned down where it is written, as the country counts its days.
import { describe, expect, expectTypeOf, it } from "vitest";
import { object } from "../../../fields/visible-text.ts";
import { day, isDay, wrongIn } from "../../../fields/fields.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { type AskWords, asking } from "./asking.ts";

import { formats } from "../../formats/masks.ts";

const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const words = {
  now: () => Date.UTC(2026, 10, 11),
  formats: formats(locale),
  optionalMark: " · opcional",
  language: "es" as const,
  today: () => "2026-11-11",
};

describe("a day that already happened", () => {
  const paid = object({ on: day("Día", "today", "today") });

  it("opens on today, takes today and any day before it, and says why a later one does not go", () => {
    const question = asking(paid, words).next([]);
    expect(question?.initial).toBe("11112026");
    expect(question?.wrong?.("11112026")).toBeUndefined();
    expect(question?.wrong?.("10112026")).toBeUndefined();
    expect(question?.wrong?.("12112026")).toBe(generic.future.es);
  });

  it("requires a real clock and day, while a day without a last bound still accepts the future", () => {
    expectTypeOf<Omit<AskWords, "now">>().not.toExtend<AskWords>();
    expectTypeOf<Omit<AskWords, "today">>().not.toExtend<AskWords>();
    expectTypeOf<() => undefined>().not.toExtend<AskWords["today"]>();
    const due = object({ on: day("Vence") });
    expect(asking(due, words).next([])?.wrong?.("12112099")).toBeUndefined();
  });

  it("checks the calendar first without requiring the program to declare the base's future reason", () => {
    const question = asking(paid, {
      ...words,
      cause: reason => {
        expect(reason).not.toBe(generic.future.es);
        return reason;
      },
    }).next([]);
    expect(question?.wrong?.("30022027")).toBe(toolTexts.noSuchDay.es);
    expect(question?.wrong?.("28022027")).toBe(generic.future.es);
  });
});

describe("a day the calendar does not have", () => {
  const due = object({ on: day("Vence") });

  it("is told apart from a real one, leap years too", () => {
    expect(["2026-02-28", "2024-02-29", "2026-12-31"].map(isDay)).toEqual([true, true, true]);
    expect(["2026-02-30", "2025-02-29", "2025-13-45", "2026-00-10", "2026-04-31"].map(isDay)).toEqual(
      Array.from({ length: 5 }, () => false),
    );
  });

  it("is turned down where it is written, and through any other door before the act runs", () => {
    expect(asking(due, words).next([])?.wrong?.("30022026")).toBe(toolTexts.noSuchDay.es);
    expect(asking(due, words).next([])?.wrong?.("28022026")).toBeUndefined();
    expect(wrongIn(due, { on: "2025-13-45" }, 0)).toBe(toolTexts.noSuchDay);
    expect(wrongIn(due, { on: "2026-02-28" }, 0)).toBeUndefined();
  });
});
