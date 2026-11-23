// Validates and trims JSON data to the requested schema, including nested objects and unions.
import { meant } from "../../fields/phrases.ts";
import { Kind, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { publicValue } from "../../adapters/public-value.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
type Shape = TSchema & { properties?: Record<string, TSchema>; items?: TSchema; anyOf?: TSchema[] };
function trim(schema: Shape, value: unknown): unknown {
  if (schema[Kind] === "Union") {
    for (const branch of schema.anyOf ?? []) {
      try {
        return projectValue(branch, value);
      } catch {
        /* Another declared variant may fit. */
      }
    }
    throw new Error(meant(contractTexts.invalidValue));
  }
  if (schema[Kind] === "Array" && Array.isArray(value) && schema.items) {
    const item = schema.items;
    return value.map(value => trim(item, value));
  }
  if (schema[Kind] === "Object" && value !== null && typeof value === "object" && !Array.isArray(value))
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).flatMap(([name, child]) =>
        Object.hasOwn(value, name) ? [[name, trim(child, Reflect.get(value, name))]] : [],
      ),
    );
  return value;
}
export function projectValue(schema: TSchema, value: unknown): unknown {
  const projected = trim(schema, publicValue(value));
  if (!Value.Check(schema, projected)) throw new Error(meant(contractTexts.invalidValue));
  return readonlyState(projected);
}
