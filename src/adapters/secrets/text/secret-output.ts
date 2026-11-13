// Structural protocol fields keep their identity; free payload text belongs to this action.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { record } from "../positions/secret-positions.ts";
import { actionText } from "./action-text.ts";
export function payloadText(schema: unknown, value: unknown, values: ReadonlyMap<string, string>): unknown {
  if (!record(schema)) return actionText(value, values);
  if ("const" in schema || "enum" in schema) return value;
  if (Array.isArray(schema.anyOf)) {
    const arms: unknown[] = schema.anyOf;
    return payloadText(
      arms.find(arm => record(arm) && Value.Check(Type.Unsafe(arm), value)),
      value,
      values,
    );
  }
  if (record(schema.properties) && record(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        payloadText(schema.properties && Reflect.get(schema.properties, key), item, values),
      ]),
    );
  if (schema.items && Array.isArray(value))
    return value.map((item: unknown) => payloadText(schema.items, item, values));
  return actionText(value, values);
}
export function houseText(
  kind: unknown,
  data: unknown,
  values: ReadonlyMap<string, string>,
  omitted: Set<unknown>,
): unknown {
  if (!record(data)) return data;
  const keys = kind === "act" ? ["input"] : ["text", "reason", "detail", "diagnostic"];
  return Object.fromEntries(
    Object.entries(data).map(([key, item]) => [key, keys.includes(key) ? actionText(item, values, omitted) : item]),
  );
}
