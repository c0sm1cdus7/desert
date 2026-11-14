import { Type } from "@sinclair/typebox";
import type { Currency } from "./money-currency.ts";
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
