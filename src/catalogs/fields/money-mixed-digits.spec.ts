import { expect, it } from "vitest";
import { shownMoney } from "./money-field.ts";
it("rejects non-ASCII digits even after an ASCII digit", () => {
  expect(() => shownMoney("1٥", { currency: "$", thousands: ".", decimal: "," })).toThrow();
});
