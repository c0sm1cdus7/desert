// A field with a format takes only the keys that fit it and shows its shape: the same on every renderer.
import { quantityDecimals } from "../catalogs/fields.ts";
import type { Mask } from "./contract.ts";
import { genericTexts as generic } from "../texts/generic-surface.texts.ts";
import { maskKeys, numericKeyReason } from "./mask-keys.ts";

/** How a country writes money and days; a program declares it once. */
export type Locale = Readonly<{ currency: string; thousands: string; decimal: string; day: string }>;
/** A mask that also knows the value it stands for, both ways: what was typed as data, and data as typed. */
export type Format = Mask &
  Readonly<{ value(typed: string): unknown; typed(value: unknown): string; keyboard: "digits" | "decimal" | "text" }>;
export type FormatName = "money" | "quantity" | "count" | "day";
const digits = /^\d+$/;
const grouped = (whole: string, separator: string): string => whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
/** Money as a cash register takes it: digits come in from the right, and the last two are always the cents. */
const money = (locale: Locale): Format => {
  const shown = (typed: string): string => {
    const cents = typed.padStart(3, "0");
    return `${locale.currency} ${grouped(cents.slice(0, -2), locale.thousands)}${locale.decimal}${cents.slice(-2)}`;
  };
  return {
    keyboard: "digits",
    empty: shown(""),
    shown,
    ...maskKeys(
      (typed, text) => (digits.test(text) && typed.length < 13 ? String(Number(typed + text)) : undefined),
      (_, text) => numericKeyReason(text, generic.lacks.most(shown("9999999999999"))),
    ),
    value: typed => (typed === "" ? undefined : Number(typed)),
    typed: value => (typeof value === "number" ? String(Math.round(value)) : ""),
  };
};
/** How many: digits, and one decimal mark after at least one digit. */
const quantity = (locale: Locale): Format => ({
  keyboard: "decimal",
  empty: "0",
  shown: typed => typed,
  ...maskKeys(
    (typed, text) => {
      const [whole = "", part] = typed.split(locale.decimal);
      /** A zero written first gives way to the digit after it: nobody reads «010». */
      if (digits.test(text) && typed === "0") return text;
      if (digits.test(text))
        return (part === undefined ? whole.length < 6 : part.length < quantityDecimals) ? typed + text : undefined;
      return text === locale.decimal && typed !== "" && !typed.includes(locale.decimal) ? typed + text : undefined;
    },
    (typed, text) =>
      text === locale.decimal
        ? generic.ignored.decimal
        : numericKeyReason(
            text,
            typed.includes(locale.decimal) ? generic.ignored.decimals(quantityDecimals) : generic.lacks.most("999999"),
          ),
  ),
  value: typed => (typed === "" ? undefined : Number(typed.replace(locale.decimal, "."))),
  typed: value => (typeof value === "number" ? String(value).replace(".", locale.decimal) : ""),
});
/** A whole number of things: digits alone. */
const count: Format = {
  keyboard: "digits",
  empty: "0",
  shown: typed => typed,
  ...maskKeys(
    (typed, text) => (digits.test(text) && typed.length < 9 ? String(Number(typed + text)) : undefined),
    (_, text) => numericKeyReason(text, generic.lacks.most("999999999")),
  ),
  value: typed => (typed === "" ? undefined : Number(typed)),
  typed: value => (typeof value === "number" ? String(value) : ""),
};
/** A day: eight digits, shown day/month/year as they are typed, kept as year-month-day. Whether the calendar has
 * that day is for its field to say, where it is written: here eight digits are a day. */
const day = (locale: Locale): Format => ({
  keyboard: "digits",
  empty: locale.day,
  shown: typed => [typed.slice(0, 2), typed.slice(2, 4), typed.slice(4)].filter(Boolean).join("/"),
  remaining: typed => locale.day.slice(typed.length + Number(typed.length > 2) + Number(typed.length > 4)),
  ...maskKeys(
    (typed, text) => (digits.test(text) && typed.length < 8 ? typed + text : undefined),
    (_, text) => numericKeyReason(text, generic.ignored.digits(8)),
  ),
  value: typed => {
    return typed.length === 8 ? `${typed.slice(4)}-${typed.slice(2, 4)}-${typed.slice(0, 2)}` : undefined;
  },
  typed: value => (typeof value === "string" ? value.split("-").reverse().join("") : ""),
});
/** The closed catalog of formats: every renderer knows these, and which keyboard each one wants. */
export const formats = (locale: Locale): Readonly<Record<FormatName, Format>> => ({
  money: money(locale),
  quantity: quantity(locale),
  count,
  day: day(locale),
});
export const isFormat = (name: unknown): name is FormatName =>
  name === "money" || name === "quantity" || name === "count" || name === "day";
/** A shape filled with the digits there are: what stands between them is written only once a digit follows. */
const filled = (shape: string, typed: string): string => {
  let [at, out] = [0, ""];
  for (const char of Array.from(shape)) {
    if (at >= typed.length) break;
    out += char === "#" ? typed.charAt(at++) : char;
  }
  return out;
};
/** Digits in a shape a program declares: `#` is a digit, anything else is written between them. One shape fills
 * as it is typed. Several are told apart by how many digits each holds: the shape shows once the count is one of
 * theirs. Kept as the digits alone. */
export function shaped(shapes: readonly string[]): Format {
  const sizes = shapes.map(shape => Array.from(shape).filter(char => char === "#").length);
  const shown = (typed: string): string => {
    const exact = shapes[sizes.indexOf(typed.length)];
    if (exact !== undefined) return filled(exact, typed);
    return shapes.length === 1 ? filled(shapes[0] ?? "", typed) : typed;
  };
  return {
    keyboard: "digits",
    empty: shapes.map(shape => shape.replaceAll("#", "0")).join(" · "),
    remaining: typed => {
      if (sizes.includes(typed.length)) return "";
      const shape = shapes.find((_, index) => (sizes[index] ?? 0) > typed.length) ?? "";
      return shape.replaceAll("#", "0").slice(shown(typed).length);
    },
    shown,
    ...maskKeys(
      (typed, text) => (digits.test(text) && typed.length < Math.max(...sizes) ? typed + text : undefined),
      (_, text) => numericKeyReason(text, generic.ignored.digits(Math.max(...sizes))),
    ),
    value: typed => (sizes.includes(typed.length) ? typed : undefined),
    typed: value => (typeof value === "string" ? value : ""),
  };
}
/** A whole number written with zeros before it, up to a width: digits come in from the right, as money does. */
export const padded = (width: number): Format => ({
  keyboard: "digits",
  empty: "0".repeat(width),
  shown: typed => typed.padStart(width, "0"),
  padding: typed => Math.max(0, width - typed.length),
  ...maskKeys(
    (typed, text) => {
      const next = String(Number(typed + text));
      return digits.test(text) && next.length <= width ? next : undefined;
    },
    (_, text) => numericKeyReason(text, generic.lacks.most(String(10 ** width - 1))),
  ),
  value: typed => (typed === "" ? undefined : Number(typed)),
  typed: value => (typeof value === "number" ? String(value) : ""),
});
/** Text of only some characters, up to a length: what is not one of them does not go in. Empty, it says what
 * goes there in the program's words. */
export const limited = (allowed: string, max: number, hint: string): Format => {
  const fits = new RegExp(`^[${allowed}]$`, "u");
  return {
    keyboard: "text",
    empty: hint,
    shown: typed => typed,
    ...maskKeys(
      (typed, text) => (fits.test(text) && Array.from(typed).length < max ? typed + text : undefined),
      (_, text) => {
        if (/\s/u.test(text)) return generic.ignored.spaces;
        return fits.test(text) ? generic.ignored.characters(max) : generic.ignored.character;
      },
    ),
    value: typed => (typed === "" ? undefined : typed),
    typed: value => (typeof value === "string" ? value : ""),
  };
};
