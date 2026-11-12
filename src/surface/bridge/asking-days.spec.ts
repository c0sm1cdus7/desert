// A day that already happened: one after today is turned down where it is written, as the country counts its days.
import { describe, expect, it } from "vitest";
import { object } from "../../catalogs/acts.ts";
import { day } from "../../catalogs/fields.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
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
