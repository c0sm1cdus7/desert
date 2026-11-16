import { expect, it } from "vitest";
import { fieldSeat } from "../../tests/support/field-seat.ts";
import { money } from "./fields.ts";
import { quietScreen } from "../checks/promises/answers/promised-entry.ts";
import { withReason } from "../checks/promises/answers/checked-reason.ts";
it("PE1: derived checks reject a screen that offers Enter beside an unresolved minimum", () => {
  const h = fieldSeat(money("Importe", 1));
  h.send({ kind: "type", text: "0" });
  h.send({ kind: "confirm" });
  const blocked = h.screen();
  expect(() => quietScreen(blocked)).not.toThrow();
  const broken = { ...blocked, hints: [...blocked.hints, { intent: "confirm", does: "anotar" } as const] };
  expect(() => quietScreen(broken)).toThrow();
});
it("CR1: the derived expected screen adds a rejected key beside the existing reason", () => {
  const h = fieldSeat(money("Importe", 1));
  h.send({ kind: "type", text: "0" });
  h.send({ kind: "confirm" });
  const expected = withReason(h.screen(), "solo números", true);
  h.send({ kind: "type", text: "x" });
  expect(h.screen()).toEqual(expected);
});

it("two discarded keys keep their advice without turning a valid value into a blocked one", () => {
  const h = fieldSeat(money("Importe", 1));
  h.send({ kind: "type", text: "9".repeat(13) });
  h.send({ kind: "type", text: "9" });
  h.send({ kind: "type", text: "x" });
  expect(h.reasons()).toEqual(["máximo $ 99.999.999.999,99", "solo números"]);
  expect(() => quietScreen(h.screen())).not.toThrow();
  expect(h.screen().hints.some(hint => hint.intent === "confirm")).toBe(true);
});
