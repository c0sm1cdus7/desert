// Every declaration branch has its own obligation, including optional fields and list items.
import { isRecord } from "../../fields/json-values.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type Position = Readonly<{ slot: string; path: readonly (string | number)[] }>;
export function declaredSecrets(schema: unknown, slot = "$"): string[] {
  if (!isRecord(schema)) return [];
  if (schema.secret === true) return [slot];
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.flatMap((arm, index) => declaredSecrets(arm, `${slot}|${index}`));
  if (isRecord(schema.properties))
    return Object.entries(schema.properties).flatMap(([key, child]) => declaredSecrets(child, `${slot}/${key}`));
  if (Array.isArray(schema.items))
    return schema.items.flatMap((child, index) => declaredSecrets(child, `${slot}/${index}`));
  return schema.items ? declaredSecrets(schema.items, `${slot}/*`) : [];
}
export function caseSecrets(
  schema: unknown,
  value: unknown,
  slot = "$",
  path: readonly (string | number)[] = [],
): Position[] {
  if (!isRecord(schema)) return [];
  if (schema.secret === true) return [{ slot, path }];
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.flatMap((arm, index) =>
      isRecord(arm) && Value.Check(Type.Unsafe(arm), value) ? caseSecrets(arm, value, `${slot}|${index}`, path) : [],
    );
  if (isRecord(schema.properties) && isRecord(value))
    return Object.entries(schema.properties).flatMap(([key, child]) =>
      Object.hasOwn(value, key) ? caseSecrets(child, value[key], `${slot}/${key}`, [...path, key]) : [],
    );
  if (schema.items && Array.isArray(value))
    return value.flatMap((item, index) =>
      caseSecrets(
        Array.isArray(schema.items) ? schema.items[index] : schema.items,
        item,
        `${slot}/${Array.isArray(schema.items) ? index : "*"}`,
        [...path, index],
      ),
    );
  return [];
}
export const valueAt = (value: unknown, path: readonly (string | number)[]): unknown =>
  path.reduce<unknown>((at, key) => (at && typeof at === "object" ? Reflect.get(at, key) : undefined), value);
