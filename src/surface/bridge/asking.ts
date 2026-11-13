import { questionMaterial } from "../../tools/inputs/question-material.ts";
import { answeredInput } from "../../tools/inputs/secret-input.ts";
// The questions of an act come from the declaration of what it takes; so do its answers, read back as data.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { isAsked } from "../../catalogs/fields.ts";
import type { Field, Option } from "../contract.ts";
import { audit, leading, markedOf, write } from "./asking-back.ts";
import { armsOf, at, choiceOf, isList, isRecord, tellingOf, titleOf, valueOf, word, written } from "./asking-parts.ts";
import type { AskWords, Ctx, Got } from "./asking-parts.ts";

export type { AskWords, Things } from "./asking-parts.ts";
const one = (ask: string, options: readonly Option[]): Field => ({ ask, kind: "one", options });
function leaf(schema: TSchema, ctx: Ctx, from: number): Got {
  const answer = ctx.answers[from];
  if (answer === undefined) return { ask: written(schema, { ...ctx, position: from }) };
  return { value: valueOf(schema, { ...ctx, position: from }, answer), at: from + 1 };
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
    /** A field that says when it is asked is skipped while what was answered before does not call for it. */
    if (skip.includes(key) || !isAsked(field, value, ctx.now())) continue;
    /** What is asked only sometimes is not left out when it is asked: then it is as needed as any other. */
    const got = read(field, { ...ctx, optional: !needed.includes(key) && at(field, "when") === undefined }, next);
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
/** Some of a closed set: one question, answered with the words of what was marked. It opens with all of them
 * marked, or with none, as the datum declares. */
function some(schema: TSchema, ctx: Ctx, from: number): Got {
  const arms = armsOf(at(schema, "items"));
  const answer = ctx.answers[from];
  const options = arms.map(arm => ({ title: word(arm, "title") }));
  const every = arms.map(arm => at(arm, "const"));
  const initial = markedOf(schema, at(schema, "some") === "all" ? every : []);
  if (answer === undefined) return { ask: { ask: titleOf(schema, ctx), kind: "many", options, initial } };
  const marked = answer === "" ? [] : answer.split(" · ");
  const values = arms.filter(arm => marked.includes(word(arm, "title"))).map(arm => at(arm, "const"));
  return { value: values, at: from + 1 };
}
function read(schema: unknown, ctx: Ctx, from: number): Got {
  if (!TypeGuard.IsSchema(schema)) throw new Error("A field has no declaration");
  const arms = armsOf(schema);
  const telling = arms.length ? tellingOf(arms) : undefined;
  if (telling) return shapes(schema, ctx, from, telling);
  if (arms.length) return choice(schema, ctx, from);
  if (at(schema, "type") === "object") return fields(schema, ctx, from);
  if (at(schema, "some") !== undefined) return some(schema, ctx, from);
  return at(schema, "type") === "array" ? items(schema, ctx, from) : leaf(schema, ctx, from);
}
export type Asking = Readonly<{
  /** The next question, or null once everything it takes was answered. */
  next(answers: readonly string[]): Field | null;
  /** How many answers say the whole datum; what comes after them is not its own. */
  taken(answers: readonly string[]): number;
  input(answers: readonly string[]): unknown;
  /** Only execution receives the private, one-use handoff from the base editor. */
  submit(answers: readonly string[]): unknown;
  answers(input: unknown): string[];
  /** The answers a datum that says only the first things gives: the rest is still to be asked. */
  leading(part: unknown): string[];
  /** What was answered so far, by its fields: the ones answered whole, in the order they are asked. */
  sofar(answers: readonly string[]): Readonly<Record<string, unknown>>;
}>;
/** The fields of what an act takes that the answers so far say whole; nothing, for what is not asked by fields. */
function sofar(schema: TSchema, ctx: Ctx): Readonly<Record<string, unknown>> {
  if (armsOf(schema).length || at(schema, "type") !== "object") return {};
  const required = at(schema, "required");
  const value: Record<string, unknown> = {};
  let next = 0;
  for (const [key, field] of Object.entries(at(schema, "properties") ?? {})) {
    if (!isAsked(field, value, ctx.now())) continue;
    const needed = (isList(required) && required.includes(key)) || at(field, "when") !== undefined;
    const got = read(field, { ...ctx, optional: !needed }, next);
    if ("ask" in got) return value;
    if (got.value !== undefined) value[key] = got.value;
    next = got.at;
  }
  return value;
}
export function asking(schema: TSchema, supplied: AskWords): Asking {
  const words = { ...supplied, secret: questionMaterial() };
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
    submit: answers => {
      const material = new Map<string, string>();
      const secret = (value: string, position: number) => {
        const ref = words.secret(value, position);
        material.set(ref, value);
        return ref;
      };
      const done = read(schema, { ...words, secret, answers, n: 1, optional: false }, 0);
      if ("ask" in done) throw new Error("An act ran before it was asked");
      return answeredInput(done.value, material);
    },
    answers: input => write(schema, input, words),
    leading: part => leading(schema, part, words),
    sofar: answers => sofar(schema, { ...words, answers, n: 1, optional: false }),
  };
}
