import { currencySymbol } from "../../catalogs/currency/currency-symbol.ts";
import type { Format, Locale } from "../masks.ts";
import { maskKeys, numericKeyReason } from "../mask-keys.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
const grouped = (whole: string, separator: string): string => whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
/** Money as a cash register takes it: digits come in from the right, and the last two are always the cents. */
export const money = (locale: Locale): Format => {
  const shown = (typed: string): string => {
    const cents = typed.padStart(3, "0");
    return `${locale.currency} ${grouped(cents.slice(0, -2), locale.thousands)}${locale.decimal}${cents.slice(-2)}`;
  };
  return {
    keyboard: "digits",
    currency: currencySymbol(locale.currency, generic.countryCurrency),
    inCurrency: currency => money({ ...locale, currency }),
    empty: shown(""),
    shown,
    ...maskKeys(
      (typed, text) => (/^\d+$/.test(text) && typed.length < 13 ? String(Number(typed + text)) : undefined),
      (_, text) => numericKeyReason(text, generic.lacks.most(shown("9999999999999"))),
    ),
    value: typed => (typed === "" ? undefined : Number(typed)),
    typed: value => (typeof value === "number" ? String(Math.round(value)) : ""),
  };
};
