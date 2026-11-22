// Resolves only explicit scalar fields of the schema and public projections of the core.
import { Type, type TSchema } from "@sinclair/typebox";
import { isRecord } from "../../fields/json-values.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import type { RuleContext, RuleField } from "./rule-schema.ts";
const forbidden = new Set(["__proto__", "constructor", "prototype"]);
const coreFields: Readonly<Record<string, TSchema>> = {
  admin: Type.String(),
  actor: Type.String(),
  actorKind: Type.String(),
  isAdmin: Type.Boolean(),
  inJourney: Type.Boolean(),
};
function descend(schema: unknown, path: readonly string[]): unknown {
  if (!isRecord(schema) || schema.secret === true || schema.$ref !== undefined) return undefined;
  if (Array.isArray(schema.anyOf)) {
    const arms: unknown[] = schema.anyOf.map(arm => descend(arm, path));
    return arms.every(isRecord) ? Type.Union(arms.map(arm => Type.Unsafe(arm))) : undefined;
  }
  if (!path.length) return schema;
  const [key = "", ...rest] = path;
  if (!isRecord(schema.properties) || !Object.hasOwn(schema.properties, key)) return undefined;
  return descend(schema.properties[key], rest);
}
function scalar(schema: unknown): boolean {
  if (!isRecord(schema)) return false;
  if (Array.isArray(schema.anyOf)) return schema.anyOf.length > 0 && schema.anyOf.every(scalar);
  return ["string", "number", "integer", "boolean", "null"].includes(String(schema.type));
}
export function fieldSchema(field: RuleField, input: unknown): TSchema | undefined {
  if (field.source === "core") return coreFields[field.path];
  const path = field.path.split(".");
  if (path.length > 16 || path.some(key => !key || forbidden.has(key))) return undefined;
  const found = descend(input, path);
  return scalar(found) && isRecord(found) ? Type.Unsafe(found) : undefined;
}
export function numericField(schema: unknown): boolean {
  if (!isRecord(schema)) return false;
  if (Array.isArray(schema.anyOf)) return schema.anyOf.every(numericField);
  return schema.type === "number" || schema.type === "integer";
}
export function actorKind(actor: string): "identity" | "program" | "assistant" {
  const mind = parseMindActor(actor);
  return mind?.kind === "tool" ? "program" : (mind?.kind ?? "identity");
}
export function fieldValue(field: RuleField, context: RuleContext): unknown {
  if (field.source === "core") {
    const values = {
      admin: context.admin,
      actor: context.actor,
      actorKind: actorKind(context.actor),
      isAdmin: context.actor === context.admin,
      inJourney: context.inJourney,
    };
    return values[field.path];
  }
  let value = context.input;
  for (const key of field.path.split(".")) {
    if (forbidden.has(key) || !isRecord(value) || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}
