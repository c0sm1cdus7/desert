// The fields an act can take. Each one carries how it is asked, so the question is declared once, with the datum.
import { Type, type TSchema } from "@sinclair/typebox";

const isoDay = "^\\d{4}-\\d{2}-\\d{2}$";
type Choice = Readonly<{ title: string; key: string }>;
/** After each thing of a list, whether another follows: the question and its two answers, each with its key. */
export type More = Readonly<{ ask: string; done: Choice; another: Choice }>;
/** Free text: the question, and a placeholder that shows what goes there. */
export const text = (ask: string, placeholder: string) => Type.String({ minLength: 1, title: ask, placeholder });
/** Money, kept in cents. */
export const money = (ask: string) => Type.Integer({ minimum: 0, title: ask, mask: "money" });
/** How many of something; `initial` is what the field already says when it opens. */
export const quantity = (ask: string, initial?: number) =>
  Type.Number({
    exclusiveMinimum: 0,
    title: ask,
    mask: "quantity",
    ...(initial === undefined ? {} : { default: initial }),
  });
/** Which one, by its position: a whole number from one up. */
export const count = (ask: string) => Type.Integer({ minimum: 1, title: ask, mask: "count" });
/** A day of the calendar, kept as year-month-day. */
export const day = (ask: string) => Type.String({ pattern: isoDay, title: ask, mask: "day" });
/** One of the things of a tool, kept as what the tool calls it: a person picks it from their list. Where the
 * field may be left without one, `none` is what that is called: «Consumidor final», «sin venta». */
export const thing = (ask: string, tool: string, none?: string) =>
  Type.String({ minLength: 1, title: ask, of: tool, ...(none === undefined ? {} : { none }) });
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
export const padded = (ask: string, width: number) => Type.Integer({ minimum: 1, title: ask, mask: "padded", width });
/** Text of only some characters, as the name someone enters with: `allowed` is what a character may be. */
export const handle = (ask: string, hint: string, allowed: string, max: number) =>
  Type.String({ pattern: `^[${allowed}]{1,${max}}$`, title: ask, placeholder: hint, mask: "chars", allowed, max });
