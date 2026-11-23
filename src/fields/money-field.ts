// Declares money in cents with a fixed currency or one the program resolves, and shares its validated format.
import { Type } from "@sinclair/typebox";
import type { Currency } from "./money-currency.ts";
import { meant, type Text } from "./phrases.ts";
const mostCents = 9_999_999_999_999;
/** The same cents and separators read by a money field, for a program's own views. */
export const shownMoney = (cents: string, locale: { currency: string; thousands: string; decimal: string }): string => {
  if (!/^(0|[1-9][0-9]*)$/u.test(cents) || Number(cents) > mostCents)
    throw new Error(`Invalid cents: ${JSON.stringify(cents)}`);
  const digits = cents.padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, locale.thousands);
  return `${locale.currency} ${whole}${locale.decimal}${digits.slice(-2)}`;
};
/** Money, kept in cents: up to what its thirteen digits say, $ 99.999.999.999,99. Where nothing is not an amount
 * — a price, a payment — `least` is one cent, and the field does not take zero. */
export const money = <State = unknown>(ask: Text, least: 0 | 1 = 0, currency?: Currency<State>) =>
  Type.Integer({
    minimum: least,
    maximum: mostCents,
    /** A question in every language is asked under `said`, as every field asks it. */
    ...(typeof ask === "string" ? { title: ask } : { title: meant(ask), said: ask }),
    mask: "money",
    ...(currency === undefined ? {} : { currency }),
  });
