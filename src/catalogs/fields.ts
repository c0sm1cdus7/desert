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
/** One of the things of a tool, kept as what the tool calls it: a person looks for it by what they type. */
export const thing = (ask: string, tool: string) => Type.String({ minLength: 1, title: ask, of: tool });
/** One value of a closed set, with the word and the key that choose it. */
export const option = <V extends string>(value: V, title: string, key: string) => Type.Literal(value, { title, key });
/** One of several: plain options, or shapes told apart by an option each of them carries. */
export const oneOf = <T extends TSchema[]>(ask: string, ...arms: [...T]) => Type.Union(arms, { title: ask });
/** One or more of the same thing. In a title, {n} is the position of the thing being asked. */
export const many = <T extends TSchema>(item: T, more: More) => Type.Array(item, { minItems: 1, more });
