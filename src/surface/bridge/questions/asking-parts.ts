// What asking an act and reading its answers share: how a declared field says its question, its options and its value.
import { at, isList, plain } from "../../../fields/json-values.ts";
import { moneyQuestion, type MoneyContext } from "./money-question.ts";
import { secretReason } from "./secret-reason.ts";
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { visibleText } from "../../../fields/visible-text.ts";
import { addresses } from "../../../texts/addressing.ts";
import { wrongIn } from "../../../fields/fields.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import type { Field, Option } from "../../contract/contract.ts";
import { isFormat, limited, padded, shaped, type Format, type FormatName } from "../../formats/masks.ts";
/** The things of a tool as an answer can pick them: found by what a person types, shown by their name. */
export type Things = Readonly<{
  found(sought: string): readonly Option[];
  shown(thing: string): string;
  has(thing: string): boolean;
  /** What is said where none of them can be picked: that the tool has none, or why they are out of reach. */
  empty: string;
  /** The act of the tool that makes a new one, as an option of their list: nothing while it cannot be done. */
  make?(act: string): Option | undefined;
}>;
/** What asking needs beyond the declaration: the formats of the program's country, the marks of an optional field
 * and of picking nothing, and the things of each tool that an answer can pick. */
export type AskWords = MoneyContext &
  Readonly<{ formats: Readonly<Record<FormatName, Format>>; optionalMark: string }> &
  Readonly<{
    things?: (tool: string) => Things | undefined;
    secret?: (material: string, position: number) => string;
    cause?: (reason: string | undefined) => string | undefined;
  }> &
  /** Today, as the program's country counts its days: what a day that is usually today opens on. */
  Readonly<{ today: () => string; now: () => number }>;
export type Got = Readonly<{ value: unknown; at: number }> | Readonly<{ ask: Field }>;
export type Ctx = AskWords & Readonly<{ answers: readonly string[]; n: number; optional: boolean; position?: number }>;

export const word = (schema: unknown, key: string): string => {
  const found = at(schema, key);
  if (typeof found !== "string" || found === "") throw new Error(`A field does not say its ${key}`);
  return found;
};
/** A question is a noun: it carries no signs and ends with no full stop or colon. */
export const asked = (question: string): string => {
  if (/[¿?¡!]|[.:]$/u.test(question)) throw new Error(`A question is a noun, without signs: ${question}`);
  if (addresses(question)) throw new Error(`A question speaks to who reads it: ${question}`);
  return question;
};
export const titleOf = (schema: unknown, ctx: Ctx): string =>
  `${asked(word(schema, "title")).replace("{n}", String(ctx.n))}${ctx.optional ? ctx.optionalMark : ""}`;
export const armsOf = (schema: unknown): readonly unknown[] => {
  const arms = at(schema, "anyOf");
  return isList(arms) ? arms : [];
};
export const choiceOf = (literal: unknown): Option => ({ title: word(literal, "title"), key: word(literal, "key") });
/** The property every shape of a union carries as one fixed option: what tells them apart. */
export const tellingOf = (arms: readonly unknown[]): string | undefined =>
  Object.keys(at(arms[0], "properties") ?? {}).find(key =>
    arms.every(arm => at(at(at(arm, "properties"), key), "const") !== undefined),
  );
const strings = (value: unknown): string[] =>
  isList(value) ? value.flatMap(each => (typeof each === "string" ? [each] : [])) : [];
/** The format a field is written in: one of the country's, or one the program declares with the datum itself. */
export const formatOf = (schema: unknown, ctx: AskWords): Format | undefined => {
  const mask = at(schema, "mask");
  if (isFormat(mask)) return ctx.formats[mask];
  if (mask === "digits") return shaped(strings(at(schema, "shapes")));
  if (mask === "padded") return padded(Number(at(schema, "width")));
  if (mask !== "chars") return undefined;
  return limited(word(schema, "allowed"), Number(at(schema, "max")), word(schema, "placeholder"));
};
/** What was typed as the datum it stands for; nothing when an optional field was left empty. */
export const valueOf = (schema: unknown, ctx: Ctx, answer: string): unknown => {
  if (ctx.optional && answer === "") return undefined;
  if (at(schema, "secret") === true)
    return TypeGuard.IsSchema(schema) && Value.Check(schema, answer)
      ? ctx.secret?.(answer, ctx.position ?? ctx.answers.length)
      : undefined;
  if (at(schema, "verbatim") === true) return answer;
  return formatOf(schema, ctx)?.value(answer) ?? (formatOf(schema, ctx) ? undefined : answer.trim());
};
/** One of the things of a tool, picked from their list. The answer is the thing; it shows by its name. A field
 * that may go without one says what that is called, and opens on it. */
function picked(schema: TSchema, ctx: Ctx, of: string): Field {
  /** Asked for each time: when a program is composed the other tools may not be there yet. */
  const things = (): Things | undefined => ctx.things?.(of);
  const absent = ctx.optional ? word(schema, "none") : "";
  const none: Option = { title: absent, value: "" };
  const makes = at(schema, "makes");
  /** Making a new one is offered after the ones there are, and never among what a person is looking for. */
  const made = (sought: string): readonly Option[] => {
    const option = typeof makes === "string" && sought.trim() === "" ? things()?.make?.(makes) : undefined;
    return option ? [option] : [];
  };
  const found = (sought: string): readonly Option[] => [
    ...(ctx.optional && sought.trim() === "" ? [none] : []),
    ...(things()?.found(sought) ?? []),
    ...made(sought),
  ];
  const valid = (answer: string): boolean => (ctx.optional && answer === "") || things()?.has(answer) === true;
  const shown = (answer: string): string => (answer === "" ? absent : (things()?.shown(answer) ?? answer));
  const empty = at(schema, "empty");
  const nothing = (): string => (typeof empty === "string" ? empty : (things()?.empty ?? ""));
  return { ask: asked(word(schema, "title")), kind: "pick", of, found, shown, valid, nothing };
}
/** A numeric prefix below the minimum can still grow: only a complete value gets a reason. */
function numericReason(schema: TSchema, ctx: Ctx, typed: string, submitted: boolean): string | undefined {
  const value = valueOf(schema, ctx, typed);
  if (typeof value !== "number") return undefined;
  const format = formatOf(schema, ctx);
  const said = (limit: number): string => format?.shown(format.typed(limit)) ?? String(limit);
  const most = at(schema, "maximum");
  if (typeof most === "number" && value > most) return generic.lacks.most(said(most));
  if (!submitted && (!format || Array.from("0123456789").some(digit => format.put(typed, digit) !== typed)))
    return undefined;
  const least = at(schema, "minimum");
  const above = at(schema, "exclusiveMinimum");
  if (typeof least === "number" && value < least) return generic.lacks.least(said(least));
  if (typeof above === "number" && value <= above) return generic.lacks.above(said(above));
  return undefined;
}
/** A submitted value that cannot satisfy its field says what still needs completing. */
function invalidReason(schema: TSchema, ctx: Ctx, typed: string, submitted: boolean): string | undefined {
  const value = valueOf(schema, ctx, typed);
  const numeric = numericReason(schema, ctx, typed, submitted);
  if (numeric !== undefined || !submitted) return numeric;
  if (typed.trim() === "") return generic.lacks.missing;
  if (at(schema, "mask") === "day") return generic.lacks.day;
  if (at(schema, "mask") === "digits") return generic.lacks.digits;
  const least = at(schema, "minLength");
  if (typeof least === "number" && typeof value === "string" && Array.from(value).length < least)
    return generic.lacks.least(generic.lacks.characters(least));
  if (at(schema, "plain") === true && typeof value === "string" && !new RegExp(visibleText).test(value))
    return generic.lacks.visible;
  return generic.lacks.shape;
}
/** A secret is checked as typed: its material never becomes a value outside the private handoff. */
const secretField = (schema: TSchema, ctx: Ctx): Field => ({
  ask: titleOf(schema, ctx),
  kind: "secret",
  valid: typed => (ctx.optional && typed === "") || Value.Check(schema, typed),
  wrong: (typed, submitted = false) => {
    if (ctx.optional && typed === "") return undefined;
    if (!Value.Check(schema, typed)) return submitted ? secretReason(schema, typed) : undefined;
    const reason = wrongIn(schema, valueOf(schema, ctx, typed), ctx.now());
    return ctx.cause ? ctx.cause(reason) : reason;
  },
});
const literalText = (schema: TSchema) => (at(schema, "verbatim") === true ? { verbatim: true as const } : {});
export function written(schema: TSchema, ctx: Ctx): Field {
  if (schema.secret === true) return secretField(schema, ctx);
  ctx = moneyQuestion(schema, ctx);
  const of = at(schema, "of");
  if (typeof of === "string") return picked(schema, ctx, of);
  const format = formatOf(schema, ctx);
  const valid = (typed: string): boolean =>
    (ctx.optional && typed === "") || Value.Check(schema, valueOf(schema, ctx, typed));
  const first = at(schema, "default") ?? (at(schema, "suggests") === "today" ? ctx.today() : undefined);
  const initial = first === undefined ? {} : { initial: format?.typed(first) ?? plain(first) };
  const ask = titleOf(schema, ctx);
  /** A day that already happened is not after today, as the program's country counts its days. */
  const late = (value: unknown): boolean =>
    at(schema, "last") === "today" && typeof value === "string" && value > ctx.today();
  const wrong = (typed: string, submitted = false): string | undefined => {
    const value = valueOf(schema, ctx, typed);
    if (!valid(typed)) return invalidReason(schema, ctx, typed, submitted);
    const reason = wrongIn(schema, value, ctx.now());
    if (reason === undefined && late(value)) return generic.future;
    return ctx.cause ? ctx.cause(reason) : reason;
  };
  /** What a person writes has a top: a number without one, or a text without a length, is a defect. */
  const numeric = at(schema, "type") === "integer" || at(schema, "type") === "number";
  if (format && numeric && typeof at(schema, "maximum") !== "number") throw new Error(`The field ${ask} has no top`);
  if (format)
    return {
      ask,
      valid,
      wrong,
      kind: "text",
      mask: format,
      ...(format.currency === undefined ? {} : { currency: format.currency }),
      ...initial,
    };
  if (at(schema, "type") !== "string") throw new Error(`The field ${ask} has no format and is not text`);
  /** A datum with a shape takes only what fits it: declared as free text, any key would go in. */
  if (at(schema, "pattern") !== undefined && at(schema, "plain") !== true)
    throw new Error(`The field ${ask} has a shape and no mask`);
  const placeholder = word(schema, "placeholder");
  const max = at(schema, "maxLength");
  if (typeof max !== "number") throw new Error(`The field ${ask} does not say how long it may be`);
  return { ask, valid, wrong, kind: "text", placeholder, max, ...initial, ...literalText(schema) };
}
