// No missing-clock default can turn a future day into an allowed one or evaluate a rule at epoch zero.
import { expect, expectTypeOf, it } from "vitest";
import { askingClock, questionWords } from "./asking-clock.ts";
import { type AskWords, asking } from "./asking.ts";

import { object } from "../../../fields/visible-text.ts";
import { day, holding, text } from "../../../fields/fields.ts";
import { shopShown } from "../../../../tests/support/shop.ts";
import { instant, localDay } from "../../../../tests/support/dated-shop.ts";

it("does not admit a question context with an absent clock or a possibly absent day", () => {
  expectTypeOf<Omit<AskWords, "now">>().not.toExtend<AskWords>();
  expectTypeOf<Omit<AskWords, "today">>().not.toExtend<AskWords>();
  expectTypeOf<() => string | undefined>().not.toExtend<AskWords["today"]>();
});
it("rejects a missing local calendar explicitly, including a day that only has a last bound", () => {
  const words = questionWords(() => instant, shopShown, "es");
  expect(() => asking(object({ on: day("Día", "today") }), words)).toThrow("OutsideDefect");
  const question = asking(object({ on: day("Día", undefined, "today") }), words).next([]);
  expect(() => question?.wrong?.("13112026")).toThrow("OutsideDefect");
});
it("uses the supplied local day and the live instant for a field's own rule", () => {
  let now = instant;
  const seen: number[] = [];
  const input = object({
    name: holding(text("Nombre", "Nombre"), (_value, at) => {
      seen.push(at);
      return undefined;
    }),
  });
  const clock = askingClock(() => now, localDay);
  const field = asking(input, questionWords(clock.now, { ...shopShown, day: localDay }, "es")).next([]);
  field?.wrong?.("Ana");
  now += 86_400_000;
  field?.wrong?.("Ana");
  expect(seen).toEqual([instant, now]);
  expect(clock.today()).toBe("2026-11-13");
});
