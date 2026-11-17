// Máscara de dinero en su moneda; conserva separadores, límites y centavos
import { currencySymbol } from "../../fields/currency-symbol.ts";
import { money as moneyField, shownMoney } from "../../fields/money-field.ts";
import type { Format, Locale } from "./masks.ts";
import { maskKeys, numericKeyReason } from "./mask-keys.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
/** Money as a cash register takes it: digits come in from the right, and the last two are always the cents. */
export const money = (locale: Locale): Format => {
  const maximum = String(moneyField("").maximum);
  const shown = (typed: string): string => shownMoney(typed || "0", locale);
  return {
    keyboard: "digits",
    currency: currencySymbol(locale.currency, generic.countryCurrency),
    inCurrency: currency => money({ ...locale, currency }),
    empty: shown(""),
    shown,
    ...maskKeys(
      (typed, text) => (/^\d+$/.test(text) && typed.length < maximum.length ? String(Number(typed + text)) : undefined),
      (_, text) => numericKeyReason(text, generic.lacks.most(shown(maximum))),
    ),
    value: typed => (typed === "" ? undefined : Number(typed)),
    typed: value => (typeof value === "number" ? String(Math.round(value)) : ""),
  };
};
