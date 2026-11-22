// The fields an act can take. Each one carries how it is asked, so the question is declared once, with the datum.
import { visibleText } from "./visible-text.ts";
import { programCall } from "./program-call.ts";
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { toolTexts } from "../texts/tools.texts.ts";
const isoDay = "^\\d{4}-\\d{2}-\\d{2}$";
type Choice = Readonly<{ title: string; key: string }>;
/** After each thing of a list, whether another follows: the question and its two answers, each with its key. */
export type More = Readonly<{ ask: string; done: Choice; another: Choice }>;
/** How long a written text may be: what fits a row and a document, never a page. */
export const textLimit = 120;
/** Free text: the question, and a placeholder that shows what goes there. It says something, not only spaces. */
export const text = (ask: string, placeholder: string) =>
  Type.String({ minLength: 1, maxLength: textLimit, pattern: visibleText, plain: true, title: ask, placeholder });
export { money, shownMoney } from "./money-field.ts";
/** How many decimals a quantity carries: what its mask lets be written, and what every door is held to. */
export const quantityDecimals = 3;
/** How many of something; `initial` is what the field already says when it opens. */
export const quantity = (ask: string, initial?: number) =>
  Type.Number({
    exclusiveMinimum: 0,
    maximum: 999_999,
    decimals: quantityDecimals,
    title: ask,
    mask: "quantity",
    ...(initial === undefined ? {} : { default: initial }),
  });
/** Which one, by its position: a whole number from one up. */
export const count = (ask: string) => Type.Integer({ minimum: 1, maximum: 999_999_999, title: ask, mask: "count" });
/** Whether what is written as year-month-day is a day the calendar has: never the 30th of February. */
export function isDay(value: string): boolean {
  const [year = 0, month = 0, date = 0] = value.split("-").map(Number);
  const real = new Date(Date.UTC(year, month - 1, date));
  return real.getUTCFullYear() === year && real.getUTCMonth() === month - 1 && real.getUTCDate() === date;
}
/** A day of the calendar, kept as year-month-day: one the calendar does not have is turned down where it is
 * written, and no act runs with it through any door. One that is usually today opens on today: a person confirms
 * it, or writes another over it. One that already happened (`last`) is never after today: a later day is turned
 * down where it is written. */
export const day = (ask: string, suggests?: "today", last?: "today") =>
  holding(
    Type.String({
      pattern: isoDay,
      title: ask,
      mask: "day",
      ...(suggests === undefined ? {} : { suggests }),
      ...(last === undefined ? {} : { last }),
    }),
    value => (isDay(value) ? undefined : toolTexts.noSuchDay),
  );
/** One of the things of a tool, kept as what the tool calls it: a person picks it from their list. Where the
 * field may be left without one, `none` is what that is called: «Consumidor final», «sin venta». Where a new one
 * can be made right there, `makes` is the act of that tool that makes it: its result is the answer.
 * Without a maker, `empty` says why the act is unavailable when nothing can be picked. */
export const thing = (ask: string, tool: string, none?: string, makes?: string, empty?: string) =>
  Type.String({
    minLength: 1,
    title: ask,
    of: tool,
    ...(none === undefined ? {} : { none }),
    ...(makes === undefined ? {} : { makes }),
    ...(empty === undefined ? {} : { empty }),
  });
/** Some of a closed set, each with its word: a person marks the ones that go. They open all marked, or none. */
export const someOf = <T extends TSchema[]>(ask: string, marked: "all" | "none", ...arms: [...T]) =>
  Type.Array(Type.Union(arms), { title: ask, uniqueItems: true, some: marked });
/** One value of a closed set, with the word and the key that choose it. */
export const option = <V extends string>(value: V, title: string, key: string) => Type.Literal(value, { title, key });
/** One of several: plain options, or shapes told apart by an option each of them carries. */
export const oneOf = <T extends TSchema[]>(ask: string, ...arms: [...T]) => Type.Union(arms, { title: ask });
/** One of several, opening on the usual one: a person confirms it, or picks another. */
export const usually = <T extends TSchema[]>(ask: string, usual: string, ...arms: [...T]) =>
  Type.Union(arms, { title: ask, default: usual });
/** One or more of the same thing. In a title, {n} is the position of the thing being asked. */
export const many = <T extends TSchema>(item: T, more: More) => Type.Array(item, { minItems: 1, more });
/** Digits in one shape or several, kept as the digits alone: `#` is a digit and the rest is written between them.
 * `00-00000000-0` for a CUIT. Only digits go in, and it is complete when it fills one of its shapes. */
export const digits = (ask: string, ...shapes: readonly string[]) => {
  const sizes = shapes.map(shape => Array.from(shape).filter(char => char === "#").length);
  return Type.String({
    pattern: `^(${sizes.map(size => `\\d{${size}}`).join("|")})$`,
    title: ask,
    mask: "digits",
    shapes,
  });
};
/** A whole number from one up, written with zeros before it up to a width: `0001`. */
export const padded = (ask: string, width: number) =>
  Type.Integer({ minimum: 1, maximum: 10 ** width - 1, title: ask, mask: "padded", width });
/** Text of only some characters, as the name someone enters with: `allowed` is what a character may be. */
export const handle = (ask: string, hint: string, allowed: string, max: number) =>
  Type.String({ pattern: `^[${allowed}]{1,${max}}$`, title: ask, placeholder: hint, mask: "chars", allowed, max });
/** Whether a field is asked, given what was answered before it in the same datum, the state of the house as whoever
 * is asked sees it, and the target the act is asked on (empty when the surface names none). */
export type Asked<S = unknown> = (
  answered: Readonly<Record<string, unknown>>,
  at: number,
  state: S,
  target: string,
) => boolean;
/** A field that is asked only when what was answered before it, or what the house keeps, calls for it: otherwise
 * nobody is asked, and the datum goes without it. Which kind of document, only once its number has eleven digits;
 * the rate of a line, only when the organization is registered. */
export const when = <T extends TSchema, S = unknown>(field: T, asked: Asked<S>) =>
  Type.Optional({ ...field, when: asked });
/** Whether a field of a datum is asked, as its declaration says: always, unless it says when. */
export function isAsked(
  schema: unknown,
  answered: Readonly<Record<string, unknown>>,
  at: number,
  state: unknown,
  target = "",
): boolean {
  const asks: unknown = schema !== null && typeof schema === "object" ? Reflect.get(schema, "when") : undefined;
  return !isAsker(asks) || programCall(asks, answered, at, state, target);
}
export const isAsker = (asks: unknown): asks is Asked => typeof asks === "function";
/** Why a datum that is complete still does not hold, when that is so: a check digit that does not match. */
export type Wrong = (value: string, at: number) => string | undefined;
/** A field that knows when what it was given is complete and wrong, and why. Said once, with the datum: the
 * surface says it where the datum is written, and no act runs with it, through whatever door it comes. */
export const holding = <T extends TSchema>(field: T, wrong: Wrong): T => ({
  ...field,
  wrong: (value: string, at: number) => wrongIn(field, value, at) ?? programCall(wrong, value, at),
});
const isWrong = (check: unknown): check is Wrong => typeof check === "function";
const part = (schema: unknown, key: string): unknown =>
  schema !== null && typeof schema === "object" ? Reflect.get(schema, key) : undefined;
const first = (causes: readonly (string | undefined)[]): string | undefined =>
  causes.find(cause => cause !== undefined);
/** Why a value does not hold as its declaration says: what the first field of it that knows says. */
export function wrongIn(schema: unknown, value: unknown, at: number): string | undefined {
  const check = part(schema, "wrong");
  if (isWrong(check) && typeof value === "string") return programCall(check, value, at);
  const arms = part(schema, "anyOf");
  if (Array.isArray(arms))
    return first(arms.map(arm => (Value.Check(arm, value) ? wrongIn(arm, value, at) : undefined)));
  if (Array.isArray(value)) return first(value.map(each => wrongIn(part(schema, "items"), each, at)));
  if (value === null || typeof value !== "object") return undefined;
  return first(Object.entries(value).map(([key, each]) => wrongIn(part(part(schema, "properties"), key), each, at)));
}
/** Whether every number of a value carries no more decimals than its field declares: a schema alone cannot say
 * it, and what a person cannot write no other door sends either. */
export function fine(schema: unknown, value: unknown): boolean {
  const decimals = part(schema, "decimals");
  if (typeof decimals === "number" && typeof value === "number") return Number(value.toFixed(decimals)) === value;
  const arms = part(schema, "anyOf");
  if (Array.isArray(arms)) return arms.every(arm => !Value.Check(arm, value) || fine(arm, value));
  if (Array.isArray(value)) return value.every(each => fine(part(schema, "items"), each));
  if (value === null || typeof value !== "object") return true;
  return Object.entries(value).every(([key, each]) => fine(part(part(schema, "properties"), key), each));
}

/** Validate a field as the house does, at the instant it is used. */
export function fieldValidity(schema: TSchema, value: unknown, at: number) {
  const invalid = !Value.Check(schema, value) || !fine(schema, value);
  return { invalid, wrong: invalid ? undefined : wrongIn(schema, value, at) };
}
