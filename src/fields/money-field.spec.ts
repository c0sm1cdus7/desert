import { expect, it } from "vitest";
import { shownMoney } from "./money-field.ts";

const locale = { currency: "$", thousands: ".", decimal: "," };
it.each([
  ["0", "$ 0,00"],
  ["1", "$ 0,01"],
  ["99", "$ 0,99"],
  ["100", "$ 1,00"],
  ["1500", "$ 15,00"],
  ["1000000", "$ 10.000,00"],
  ["9999999999999", "$ 99.999.999.999,99"],
])("shows %s cents as %s", (input, expected) => {
  expect(shownMoney(input, locale)).toBe(expected);
});
it.each([
  "99999999999999",
  "-5",
  "-500",
  "-1",
  "150.5",
  "0.001",
  "1e+21",
  "NaN",
  "Infinity",
  "",
  " ",
  " 1 ",
  "0015",
  "abc",
])("rejects invalid cents %j and names what it received", input => {
  expect(() => shownMoney(input, locale)).toThrow(JSON.stringify(input));
});
