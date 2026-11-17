// Cierra las entradas del menú sin perder las restricciones que se comprueban localmente.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { requireMind } from "../../fields/mind-errors.ts";
const record = (value: unknown): value is Record<string | symbol, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function close(value: unknown, seen: Set<object>): unknown {
  if (Array.isArray(value)) {
    requireMind(!seen.has(value), "menu.recursion");
    return value.map(child => close(child, new Set(seen).add(value)));
  }
  if (!record(value)) return value;
  requireMind(!seen.has(value), "menu.recursion");
  requireMind(!value.$ref && !value.patternProperties, "menu.schema");
  const path = new Set(seen).add(value);
  const copy: Record<string | symbol, unknown> = { ...value };
  if (value.type === "object") {
    requireMind(record(value.properties), "menu.properties");
    copy.additionalProperties = false;
    copy.properties = Object.fromEntries(
      Object.entries(value.properties).map(([key, child]) => [key, close(child, path)]),
    );
  }
  if (value.type === "array") copy.items = close(value.items, path);
  for (const key of ["anyOf", "allOf", "oneOf"])
    if (Array.isArray(value[key])) copy[key] = value[key].map(child => close(child, path));
  requireMind(value.type !== undefined || Array.isArray(value.anyOf) || TypeGuard.IsNever(value), "menu.type");
  return copy;
}
export function closedAnswerInput(schema: TSchema): TSchema {
  const result = close(schema, new Set());
  requireMind(TypeGuard.IsSchema(result), "menu.schema");
  return result;
}
