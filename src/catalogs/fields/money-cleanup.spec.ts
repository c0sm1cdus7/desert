import { expect, it } from "vitest";
import { shownMoney } from "./money-field.ts";
const locale = { currency: "$", thousands: ".", decimal: "," };
it.each(["5\n", "5 ", " 5", "１５", "٥", "5+", "1+5"])("rejects %j", input => {
  expect(() => shownMoney(input, locale)).toThrow(JSON.stringify(input));
});
