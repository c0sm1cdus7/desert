// What an act's schema does not admit, made from an input it does: nobody writes these, the schema says them.
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
const at = (schema: unknown, key: string): unknown => (isRecord(schema) ? schema[key] : undefined);
/** A value of the same kind that the schema's own limits leave out: below its minimum and above its maximum,
 * shorter and longer than it allows, and only spaces where it has to say something. */
function beyond(schema: unknown, value: unknown): unknown[] {
  const least = at(schema, "exclusiveMinimum") ?? at(schema, "minimum");
  const most = at(schema, "maximum");
  if (typeof value === "number")
    return [...(typeof least === "number" ? [least - 1] : []), ...(typeof most === "number" ? [most + 1] : [])];
  const long = at(schema, "maxLength");
  if (typeof value === "string" && typeof long === "number") return ["", " ", "a".repeat(long + 1)];
  if (typeof value === "string" && typeof at(schema, "minLength") === "number") return [""];
  if (isList(value) && typeof at(schema, "minItems") === "number") return [[]];
  return [];
}
/** Every way to break one thing of a value: itself, one of its properties, or one of the things it lists. */
function broken(schema: unknown, value: unknown): unknown[] {
  const own = beyond(schema, value);
  if (isList(value)) {
    const [first, ...rest] = value;
    const inside = broken(at(schema, "items"), first).map((item): unknown => [item, ...rest]);
    return value.length ? [...own, ...inside] : own;
  }
  if (!isRecord(value)) return own;
  const arms = at(schema, "anyOf");
  const shapes = isList(arms) ? arms : [schema];
  const inside = Object.entries(value).flatMap(([key, item]) =>
    shapes.flatMap(shape => broken(at(at(shape, "properties"), key), item).map(wrong => ({ ...value, [key]: wrong }))),
  );
  const less = Object.keys(value).map(key => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key)));
  return [...own, { ...value, "not-asked": true }, ...less, ...inside];
}
/** Only what the schema truly refuses, each once: a property that may be left out is not a way to break it. */
export function outsideOf(schema: TSchema, value: unknown): unknown[] {
  const seen = new Set<string>();
  return broken(schema, value).filter(variant => {
    const key = JSON.stringify(variant);
    if (seen.has(key) || Value.Check(schema, variant)) return false;
    seen.add(key);
    return true;
  });
}
