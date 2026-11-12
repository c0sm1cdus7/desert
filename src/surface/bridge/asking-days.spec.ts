// A day that already happened: one after today is turned down where it is written, as the country counts its days.
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { day, isDay, wrongIn } from "../../catalogs/fields.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { asking } from "./asking.ts";
import { formats } from "../masks.ts";

const locale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
const words = { formats: formats(locale), optionalMark: " · opcional", today: () => "2026-11-11" };

describe("a day that already happened", () => {
  const paid = object({ on: day("Día", "today", "today") });

  it("opens on today, takes today and any day before it, and says why a later one does not go", () => {
    const question = asking(paid, words).next([]);
    expect(question?.initial).toBe("11112026");
    expect(question?.wrong?.("11112026")).toBeUndefined();
    expect(question?.wrong?.("10112026")).toBeUndefined();
    expect(question?.wrong?.("12112026")).toBe(generic.future);
  });

  it("holds no day to today where nobody says what today is, nor a day that does not say it already happened", () => {
    expect(
      asking(paid, { ...words, today: () => undefined })
        .next([])
        ?.wrong?.("12112099"),
    ).toBeUndefined();
    const due = object({ on: day("Vence") });
    expect(asking(due, words).next([])?.wrong?.("12112099")).toBeUndefined();
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
    expect(asking(due, words).next([])?.wrong?.("30022026")).toBe(toolTexts.noSuchDay);
    expect(asking(due, words).next([])?.wrong?.("28022026")).toBeUndefined();
    expect(wrongIn(due, { on: "2025-13-45" })).toBe(toolTexts.noSuchDay);
    expect(wrongIn(due, { on: "2026-02-28" })).toBeUndefined();
  });
});
