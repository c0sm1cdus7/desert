import { currencySymbol } from "../../catalogs/currency/currency-symbol.ts";
import { shownMoney } from "../../catalogs/fields/money-field.ts";
import type { Format, Locale } from "../masks.ts";
import { maskKeys, numericKeyReason } from "../mask-keys.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
/** Money as a cash register takes it: digits come in from the right, and the last two are always the cents. */
export const money = (locale: Locale): Format => {
  const shown = (typed: string): string => shownMoney(typed, locale);
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
