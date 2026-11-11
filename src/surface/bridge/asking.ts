// The questions of an act come from the declaration of what it takes; so do its answers, read back as data.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import type { Field, Option } from "../contract.ts";
import { audit, leading, write } from "./asking-back.ts";
import { armsOf, at, choiceOf, isList, isRecord, tellingOf, titleOf, valueOf, word, written } from "./asking-parts.ts";
import type { AskWords, Ctx, Got } from "./asking-parts.ts";

export type { AskWords, Things } from "./asking-parts.ts";
const one = (ask: string, options: readonly Option[]): Field => ({ ask, kind: "one", options });
function leaf(schema: TSchema, ctx: Ctx, from: number): Got {
  const answer = ctx.answers[from];
  if (answer === undefined) return { ask: written(schema, ctx) };
  return { value: valueOf(schema, ctx, answer), at: from + 1 };
}
function choice(schema: TSchema, ctx: Ctx, from: number): Got {
  const arms = armsOf(schema);
  const answer = ctx.answers[from];
  /** A choice that has a usual answer opens on it. */
  const usual = arms.find(arm => at(arm, "const") !== undefined && at(arm, "const") === at(schema, "default"));
  const opening = usual ? { initial: word(usual, "title") } : {};
  if (answer === undefined) return { ask: { ...one(titleOf(schema, ctx), arms.map(choiceOf)), ...opening } };
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
export type Asking = Readonly<{
  /** The next question, or null once everything it takes was answered. */
  next(answers: readonly string[]): Field | null;
  /** How many answers say the whole datum; what comes after them is not its own. */
  taken(answers: readonly string[]): number;
  input(answers: readonly string[]): unknown;
  answers(input: unknown): string[];
  /** The answers a datum that says only the first things gives: the rest is still to be asked. */
  leading(part: unknown): string[];
}>;
export function asking(schema: TSchema, words: AskWords): Asking {
  const got = (answers: readonly string[]): Got => read(schema, { ...words, answers, n: 1, optional: false }, 0);
  const whole = (answers: readonly string[]) => {
    const done = got(answers);
    if ("ask" in done) throw new Error(`An act ran before it was asked: ${done.ask.ask}`);
    return done;
  };
  // A field that cannot be asked is a defect of the program: it shows when the program is composed, not when used.
  audit(schema, { ...words, answers: [], n: 1, optional: false });
  return {
    next: answers => {
      const done = got(answers);
      return "ask" in done ? done.ask : null;
    },
    taken: answers => whole(answers).at,
    input: answers => whole(answers).value,
    answers: input => write(schema, input, words),
    leading: part => leading(schema, part, words),
  };
}
