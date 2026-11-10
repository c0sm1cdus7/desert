// A field with a format takes only the keys that fit it and shows its shape: the same on every renderer.
import type { Mask } from "./contract.ts";

/** How a country writes money and days; a program declares it once. */
export type Locale = Readonly<{ currency: string; thousands: string; decimal: string; day: string }>;
/** A mask that also knows the value it stands for, both ways: what was typed as data, and data as typed. */
export type Format = Mask &
  Readonly<{ value(typed: string): unknown; typed(value: unknown): string; keyboard: "digits" | "decimal" }>;
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
    put: (typed, text) => (digits.test(text) && typed.length < 13 ? String(Number(typed + text)) : typed),
    value: typed => (typed === "" ? undefined : Number(typed)),
    typed: value => (typeof value === "number" ? String(Math.round(value)) : ""),
  };
};
/** How many: digits, and one decimal mark after at least one digit. */
const quantity = (locale: Locale): Format => ({
  keyboard: "decimal",
  empty: "0",
  shown: typed => typed,
  put: (typed, text) => {
    if (digits.test(text)) return typed.length < 12 ? typed + text : typed;
    return text === locale.decimal && typed !== "" && !typed.includes(locale.decimal) ? typed + text : typed;
  },
  value: typed => (typed === "" ? undefined : Number(typed.replace(locale.decimal, "."))),
  typed: value => (typeof value === "number" ? String(value).replace(".", locale.decimal) : ""),
});
/** A whole number of things: digits alone. */
const count: Format = {
  keyboard: "digits",
  empty: "0",
  shown: typed => typed,
  put: (typed, text) => (digits.test(text) && typed.length < 9 ? String(Number(typed + text)) : typed),
  value: typed => (typed === "" ? undefined : Number(typed)),
  typed: value => (typeof value === "number" ? String(value) : ""),
};
const isDay = (iso: string): boolean => {
  const at = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(at) && new Date(at).toISOString().slice(0, 10) === iso;
};
/** A day: eight digits, shown day/month/year as they are typed, kept as year-month-day. */
const day = (locale: Locale): Format => ({
  keyboard: "digits",
  empty: locale.day,
  shown: typed => [typed.slice(0, 2), typed.slice(2, 4), typed.slice(4)].filter(Boolean).join("/"),
  put: (typed, text) => (digits.test(text) && typed.length < 8 ? typed + text : typed),
  value: typed => {
    const iso = `${typed.slice(4)}-${typed.slice(2, 4)}-${typed.slice(0, 2)}`;
    return typed.length === 8 && isDay(iso) ? iso : undefined;
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
