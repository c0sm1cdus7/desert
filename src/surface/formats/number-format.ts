// Permite escribir números finitos con signo y decimales sin imponer la máscara de cantidades positivas.
import type { Format, Locale } from "./masks.ts";
import { maskKeys } from "./mask-keys.ts";
import { genericTexts } from "../../texts/generic-surface.texts.ts";
export function numberFormat(locale: Locale): Format {
  const canonical = (typed: string) => typed.replace(locale.decimal, ".");
  const prefix = /^-?(?:\d+(?:\.\d*)?(?:e[+-]?\d*)?)?$/u;
  const complete = /^-?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/u;
  return {
    keyboard: "text",
    empty: "0",
    shown: typed => typed,
    ...maskKeys(
      (typed, text) => {
        const next = typed + text;
        return next.length <= 40 && prefix.test(canonical(next)) ? next : undefined;
      },
      () => genericTexts.ignored.character,
    ),
    value: typed => {
      const value = canonical(typed);
      return complete.test(value) && Number.isFinite(Number(value)) ? Number(value) : undefined;
    },
    typed: value => (typeof value === "number" ? String(value).replace(".", locale.decimal) : ""),
  };
}
