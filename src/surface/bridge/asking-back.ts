// The walk of an act's questions backwards: the answers that say a datum; and that every field of it can be asked.
import { TypeGuard } from "@sinclair/typebox";
import type { Option } from "../contract.ts";
import { armsOf, at, choiceOf, formatOf, isList, plain, tellingOf, titleOf, word, written } from "./asking-parts.ts";
import type { AskWords, Ctx } from "./asking-parts.ts";

/** The same walk backwards: the answers a person would give to say this datum. */
export function write(schema: unknown, value: unknown, words: AskWords): string[] {
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
/** The answers to the first things a declaration asks, for as long as the datum says them: where it stops saying,
 * the questions begin. */
export function leading(schema: unknown, value: unknown, words: AskWords): string[] {
  const answers: string[] = [];
  for (const [key, field] of Object.entries(at(schema, "properties") ?? {})) {
    if (at(value, key) === undefined) break;
    answers.push(...write(field, at(value, key), words));
  }
  return answers;
}
/** The options of one question, each with its word and a key no other option of it takes. */
function distinct(options: readonly Option[]): void {
  const keys = options.map(option => option.key);
  if (new Set(keys).size !== keys.length) throw new Error(`Two options take the same key: ${keys.join(", ")}`);
}
const auditFields = (schema: unknown, ctx: Ctx, skip: readonly string[] = []): void =>
  Object.entries(at(schema, "properties") ?? {})
    .filter(([key]) => !skip.includes(key))
    .forEach(([, field]) => audit(field, ctx));
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
  else if (at(schema, "type") === "array") {
    const more = at(schema, "more");
    word(more, "ask");
    distinct([choiceOf(at(more, "done")), choiceOf(at(more, "another"))]);
    audit(at(schema, "items"), ctx);
  } else written(schema, ctx);
}
