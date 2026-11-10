// The questions of an act come from the declaration of what it takes; so do its answers, read back as data.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { Field, Option } from "../contract.ts";
import { isFormat, type Format, type FormatName } from "../masks.ts";

/** What asking needs beyond the declaration: the formats of the program's country, and the mark of an optional. */
export type AskWords = Readonly<{ formats: Readonly<Record<FormatName, Format>>; optionalMark: string }>;
type Got = Readonly<{ value: unknown; at: number }> | Readonly<{ ask: Field }>;
type Ctx = AskWords & Readonly<{ answers: readonly string[]; n: number; optional: boolean }>;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
const at = (schema: unknown, key: string): unknown => (isRecord(schema) ? schema[key] : undefined);
const plain = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));
const word = (schema: unknown, key: string): string => {
  const found = at(schema, key);
  if (typeof found !== "string" || found === "") throw new Error(`A field does not say its ${key}`);
  return found;
};
const titleOf = (schema: unknown, ctx: Ctx): string =>
  `${word(schema, "title").replace("{n}", String(ctx.n))}${ctx.optional ? ctx.optionalMark : ""}`;
const armsOf = (schema: unknown): readonly unknown[] => {
  const arms = at(schema, "anyOf");
  return isList(arms) ? arms : [];
};
const choiceOf = (literal: unknown): Option => ({ title: word(literal, "title"), key: word(literal, "key") });
/** The property every shape of a union carries as one fixed option: what tells them apart. */
const tellingOf = (arms: readonly unknown[]): string | undefined =>
  Object.keys(at(arms[0], "properties") ?? {}).find(key =>
    arms.every(arm => at(at(at(arm, "properties"), key), "const") !== undefined),
  );
const formatOf = (schema: unknown, ctx: AskWords): Format | undefined => {
  const mask = at(schema, "mask");
  return isFormat(mask) ? ctx.formats[mask] : undefined;
};
/** What was typed as the datum it stands for; nothing when an optional field was left empty. */
const valueOf = (schema: unknown, ctx: Ctx, answer: string): unknown => {
  if (ctx.optional && answer === "") return undefined;
  return formatOf(schema, ctx)?.value(answer) ?? (formatOf(schema, ctx) ? undefined : answer.trim());
};
function written(schema: TSchema, ctx: Ctx): Field {
  const format = formatOf(schema, ctx);
  const valid = (typed: string): boolean =>
    (ctx.optional && typed === "") || Value.Check(schema, valueOf(schema, ctx, typed));
  const first = at(schema, "default");
  const initial = first === undefined ? {} : { initial: format?.typed(first) ?? plain(first) };
  const ask = titleOf(schema, ctx);
  if (format) return { ask, valid, kind: "text", mask: format, ...initial };
  if (at(schema, "type") !== "string") throw new Error(`The field ${ask} has no format and is not text`);
  return { ask, valid, kind: "text", placeholder: word(schema, "placeholder"), ...initial };
}
const one = (ask: string, options: readonly Option[]): Field => ({ ask, kind: "one", options });
function leaf(schema: TSchema, ctx: Ctx, from: number): Got {
  const answer = ctx.answers[from];
  if (answer === undefined) return { ask: written(schema, ctx) };
  return { value: valueOf(schema, ctx, answer), at: from + 1 };
}
function choice(schema: TSchema, ctx: Ctx, from: number): Got {
  const arms = armsOf(schema);
  const answer = ctx.answers[from];
  if (answer === undefined) return { ask: one(titleOf(schema, ctx), arms.map(choiceOf)) };
  return {
    value: at(
      arms.find(arm => at(arm, "title") === answer),
      "const",
    ),
    at: from + 1,
  };
}
/** A union of shapes: first which one, by the option that tells them apart; then what that shape takes. */
function shapes(schema: TSchema, ctx: Ctx, from: number, telling: string): Got {
  const arms = armsOf(schema);
  const literal = (arm: unknown): unknown => at(at(arm, "properties"), telling);
  const answer = ctx.answers[from];
  if (answer === undefined)
    return {
      ask: one(
        titleOf(schema, ctx),
        arms.map(arm => choiceOf(literal(arm))),
      ),
    };
  const chosen = arms.find(arm => at(literal(arm), "title") === answer);
  const rest = fields(chosen, ctx, from + 1, [telling]);
  if ("ask" in rest) return rest;
  return {
    value: { [telling]: at(literal(chosen), "const"), ...(isRecord(rest.value) ? rest.value : {}) },
    at: rest.at,
  };
}
function fields(schema: unknown, ctx: Ctx, from: number, skip: readonly string[] = []): Got {
  const required = at(schema, "required");
  const needed = isList(required) ? required : [];
  let next = from;
  const value: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(at(schema, "properties") ?? {})) {
    if (skip.includes(key)) continue;
    const got = read(field, { ...ctx, optional: !needed.includes(key) }, next);
    if ("ask" in got) return got;
    if (got.value !== undefined) value[key] = got.value;
    next = got.at;
  }
  return { value, at: next };
}
function items(schema: TSchema, ctx: Ctx, from: number, before: readonly unknown[] = []): Got {
  const got = read(at(schema, "items"), { ...ctx, n: before.length + 1, optional: false }, from);
  if ("ask" in got) return got;
  const more = at(schema, "more");
  const done = choiceOf(at(more, "done"));
  const another = choiceOf(at(more, "another"));
  const answer = ctx.answers[got.at];
  if (answer === undefined) return { ask: one(word(more, "ask"), [done, another]) };
  const all = [...before, got.value];
  return answer === another.title ? items(schema, ctx, got.at + 1, all) : { value: all, at: got.at + 1 };
}
function read(schema: unknown, ctx: Ctx, from: number): Got {
  if (!TypeGuard.IsSchema(schema)) throw new Error("A field has no declaration");
  const arms = armsOf(schema);
  const telling = arms.length ? tellingOf(arms) : undefined;
  if (telling) return shapes(schema, ctx, from, telling);
  if (arms.length) return choice(schema, ctx, from);
  if (at(schema, "type") === "object") return fields(schema, ctx, from);
  return at(schema, "type") === "array" ? items(schema, ctx, from) : leaf(schema, ctx, from);
}
/** The same walk backwards: the answers a person would give to say this datum. */
function write(schema: unknown, value: unknown, words: AskWords): string[] {
  const arms = armsOf(schema);
  const telling = arms.length ? tellingOf(arms) : undefined;
  const literal = (arm: unknown): unknown => (telling ? at(at(arm, "properties"), telling) : arm);
  const picked = arms.find(arm => at(literal(arm), "const") === (telling ? at(value, telling) : value));
  if (arms.length)
    return [word(literal(picked), "title"), ...(telling ? written_(picked, value, words, [telling]) : [])];
  if (at(schema, "type") === "object") return written_(schema, value, words);
  if (isList(value)) {
    const more = at(schema, "more");
    const follows = (index: number): string => word(at(more, index < value.length - 1 ? "another" : "done"), "title");
    return value.flatMap((item, index) => [...write(at(schema, "items"), item, words), follows(index)]);
  }
  if (value === undefined) return [""];
  return [formatOf(schema, words)?.typed(value) ?? plain(value)];
}
const written_ = (schema: unknown, value: unknown, words: AskWords, skip: readonly string[] = []): string[] =>
  Object.entries(at(schema, "properties") ?? {})
    .filter(([key]) => !skip.includes(key))
    .flatMap(([key, field]) => write(field, at(value, key), words));
export type Asking = Readonly<{
  /** The next question, or null once everything it takes was answered. */
  next(answers: readonly string[]): Field | null;
  /** How many answers say the whole datum; what comes after them is not its own. */
  taken(answers: readonly string[]): number;
  input(answers: readonly string[]): unknown;
  answers(input: unknown): string[];
}>;
export function asking(schema: TSchema, words: AskWords): Asking {
  const got = (answers: readonly string[]): Got => read(schema, { ...words, answers, n: 1, optional: false }, 0);
  const whole = (answers: readonly string[]) => {
    const done = got(answers);
    if ("ask" in done) throw new Error(`An act ran before it was asked: ${done.ask.ask}`);
    return done;
  };
  // A field that cannot be asked is a defect of the program: it shows when the program is composed, not when used.
  write(schema, undefined, words);
  return {
    next: answers => {
      const done = got(answers);
      return "ask" in done ? done.ask : null;
    },
    taken: answers => whole(answers).at,
    input: answers => whole(answers).value,
    answers: input => write(schema, input, words),
  };
}
