import { Type } from "@sinclair/typebox";
import type { Currency } from "./money-currency.ts";
/** The same cents and separators read by a money field, for a program's own views. */
export const shownMoney = (cents: string, locale: { currency: string; thousands: string; decimal: string }): string => {
  const digits = cents.padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, locale.thousands);
  return `${locale.currency} ${whole}${locale.decimal}${digits.slice(-2)}`;
};
/** Money, kept in cents: up to what its thirteen digits say, $ 99.999.999.999,99. Where nothing is not an amount
 * — a price, a payment — `least` is one cent, and the field does not take zero. */
export const money = <State = unknown>(ask: string, least: 0 | 1 = 0, currency?: Currency<State>) =>
  Type.Integer({
    minimum: least,
    maximum: 9_999_999_999_999,
    title: ask,
    mask: "money",
    ...(currency === undefined ? {} : { currency }),
  });
