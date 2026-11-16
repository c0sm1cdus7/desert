// Resolve marked containers before capturing or writing any part of an input.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { marked, record } from "./positions/secret-positions.ts";
export function secretShape(schema: unknown, value: unknown): boolean {
  if (!record(schema) || !marked(schema)) return true;
  if (schema.secret === true) return typeof value === "string";
  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter(arm => record(arm) && Value.Check(Type.Unsafe(arm), value));
    return matches.length > 0 && matches.every(arm => secretShape(arm, value));
  }
  if (record(schema.properties)) {
    if (!record(value)) return false;
    return Object.entries(schema.properties).every(
      ([key, child]) => !Object.hasOwn(value, key) || secretShape(child, value[key]),
    );
  }
  if (schema.items)
    return (
      Array.isArray(value) &&
      value.every((item, index) => secretShape(Array.isArray(schema.items) ? schema.items[index] : schema.items, item))
    );
  return true;
}
