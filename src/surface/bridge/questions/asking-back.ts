// The walk of an act's questions backwards: the answers that say a datum; and that every field of it can be asked.
import { at, isList, isRecord, plain } from "../../../fields/json-values.ts";
import { TypeGuard } from "@sinclair/typebox";
import { isAsked } from "../../../fields/fields.ts";
import type { Option } from "../../contract/contract.ts";
import {
  armsOf,
  asked,
  choiceOf,
  formatOf,
  tellingOf,
  titleOf,
  word,
  written,
  type AskWords,
  type Ctx,
} from "./asking-parts.ts";

/** Some of a closed set as one answer: the words of the ones a datum holds, in the order the set lists them. */
export const markedOf = (schema: unknown, values: unknown): string =>
  armsOf(at(schema, "items"))
    .filter(arm => isList(values) && values.includes(at(arm, "const")))
    .map(arm => word(arm, "title"))
    .join(" · ");
/** The same walk backwards: the answers a person would give to say this datum. */
export function write(schema: unknown, value: unknown, words: AskWords, optional = false): string[] {
  const arms = armsOf(schema);
  const telling = arms.length ? tellingOf(arms) : undefined;
  const literal = (arm: unknown): unknown => (telling ? at(at(arm, "properties"), telling) : arm);
  const picked = arms.find(arm => at(literal(arm), "const") === (telling ? at(value, telling) : value));
  if (arms.length)
    return [word(literal(picked), "title"), ...(telling ? written_(picked, value, words, [telling]) : [])];
  if (at(schema, "type") === "object") return written_(schema, value, words);
  if (at(schema, "some") !== undefined) return [markedOf(schema, value)];
  if (at(schema, "type") === "array" && optional) {
    const more = at(schema, "more");
    return value === undefined
      ? [word(at(more, "done"), "title")]
      : [word(at(more, "another"), "title"), ...write(schema, value, words)];
  }
  if (isList(value)) {
    const more = at(schema, "more");
    const follows = (index: number): string => word(at(more, index < value.length - 1 ? "another" : "done"), "title");
    const opening = at(schema, "minItems") === 0 ? [word(at(more, value.length ? "another" : "done"), "title")] : [];
    return [
      ...opening,
      ...value.flatMap((item, index) => [...write(at(schema, "items"), item, words), follows(index)]),
    ];
  }
  if (value === undefined) return [""];
  return [formatOf(schema, words)?.typed(value) ?? plain(value)];
}
/** What a datum says of what was answered: itself, when it is one made of fields. */
const answeredIn = (value: unknown): Readonly<Record<string, unknown>> => (isRecord(value) ? value : {});
const optionalField = (schema: unknown, key: string, field: unknown): boolean => {
  const required = at(schema, "required");
  return !(isList(required) && required.includes(key)) && at(field, "when") === undefined;
};
const written_ = (schema: unknown, value: unknown, words: AskWords, skip: readonly string[] = []): string[] =>
  Object.entries(at(schema, "properties") ?? {})
    .filter(([key, field]) => !skip.includes(key) && isAsked(field, answeredIn(value), words.now()))
    .flatMap(([key, field]) => write(field, at(value, key), words, optionalField(schema, key, field)));
/** The answers to the first things a declaration asks, for as long as the datum says them: where it stops saying,
 * the questions begin. */
export function leading(schema: unknown, value: unknown, words: AskWords): string[] {
  const answers: string[] = [];
  for (const [key, field] of Object.entries(at(schema, "properties") ?? {})) {
    if (!isAsked(field, answeredIn(value), words.now())) continue;
    if (at(value, key) === undefined) break;
    answers.push(...write(field, at(value, key), words, optionalField(schema, key, field)));
  }
  return answers;
}
/** The options of one question, each with its word and a key no other option of it takes. */
function distinct(options: readonly Option[]): void {
  const keys = options.map(option => option.key);
  if (new Set(keys).size !== keys.length) throw new Error(`Two options take the same key: ${keys.join(", ")}`);
}
const auditFields = (schema: unknown, ctx: Ctx, skip: readonly string[] = []): void => {
  const required = at(schema, "required");
  const needed = isList(required) ? required : [];
  Object.entries(at(schema, "properties") ?? {})
    .filter(([key]) => !skip.includes(key))
    .forEach(([key, field]) => audit(field, { ...ctx, optional: !needed.includes(key) }));
};
/** Every field of a declaration can be asked: its question, its mask or placeholder, each option with its key. */
export function audit(schema: unknown, ctx: Ctx): void {
  if (!TypeGuard.IsSchema(schema)) throw new Error("A field has no declaration");
  const arms = armsOf(schema);
  const telling = arms.length ? tellingOf(arms) : undefined;
  if (arms.length) {
    titleOf(schema, ctx);
    distinct(arms.map(arm => choiceOf(telling ? at(at(arm, "properties"), telling) : arm)));
    if (telling) arms.forEach(arm => auditFields(arm, ctx, [telling]));
  } else if (at(schema, "type") === "object") auditFields(schema, ctx);
  else if (at(schema, "some") !== undefined) {
    titleOf(schema, ctx);
    armsOf(at(schema, "items")).forEach(arm => word(arm, "title"));
  } else if (at(schema, "type") === "array") {
    const more = at(schema, "more");
    asked(word(more, "ask"));
    distinct([choiceOf(at(more, "done")), choiceOf(at(more, "another"))]);
    audit(at(schema, "items"), ctx);
  } else written(schema, ctx);
}
