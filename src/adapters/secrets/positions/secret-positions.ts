// Declared positions are replaced structurally, independently of their spelling or length.
import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
export const referencePattern = "^secret:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
export const isReference = (value: unknown): boolean =>
  typeof value === "string" && new RegExp(referencePattern, "u").test(value);
export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const schemaOf = (value: unknown): TSchema => Type.Unsafe(record(value) ? value : {});
export const marked = (schema: unknown): boolean =>
  record(schema) &&
  (schema.secret === true ||
    Object.values(schema).some(child => (Array.isArray(child) ? child.some(marked) : marked(child))));
export class SecretSchemaError extends Error {
  readonly code = "E-SECRET-SCHEMA";
  constructor() {
    super(secretTexts.schema);
  }
}
export function checkSecrets(schema: unknown): void {
  if (!record(schema)) return;
  if (schema.secret === true && (schema.type !== "string" || schema.anyOf || schema.allOf || schema.not))
    throw new SecretSchemaError();
  if (marked(schema) && (schema.allOf || schema.$ref || schema.not || schema.patternProperties))
    throw new SecretSchemaError();
  const supported = ["properties", "items", "anyOf"];
  for (const [key, child] of Object.entries(schema))
    if (!supported.includes(key) && (Array.isArray(child) ? child.some(marked) : marked(child)))
      throw new SecretSchemaError();
  if (record(schema.properties)) Object.values(schema.properties).forEach(checkSecrets);
  if (Array.isArray(schema.anyOf)) schema.anyOf.forEach(checkSecrets);
  if (Array.isArray(schema.items)) schema.items.forEach(checkSecrets);
  else checkSecrets(schema.items);
}
type Replace = (value: unknown, path: string) => unknown;
const pointer = (key: string) => key.replaceAll("~", "~0").replaceAll("/", "~1");
export function secretPositions(schema: unknown, value: unknown, replace: Replace, path = ""): unknown {
  if (!record(schema)) return value;
  if (schema.secret === true) return replace(value, path || "/");
  if (Array.isArray(schema.anyOf)) {
    const arms: unknown[] = schema.anyOf;
    const matches = arms.filter(arm => Value.Check(schemaOf(arm), value));
    if (!matches.length) return marked(schema) ? replace(value, path || "/") : value;
    return matches.reduce((kept, arm) => secretPositions(arm, kept, replace, path), value);
  }
  if (marked(schema) && ((schema.properties && !record(value)) || (schema.items && !Array.isArray(value))))
    return replace(value, path || "/");
  if (record(schema.properties) && record(value)) {
    const kept = { ...value };
    for (const [key, child] of Object.entries(schema.properties))
      if (Object.hasOwn(value, key)) kept[key] = secretPositions(child, value[key], replace, `${path}/${pointer(key)}`);
    return kept;
  }
  if (schema.items && Array.isArray(value))
    return value.map((item: unknown, index) =>
      secretPositions(
        Array.isArray(schema.items) ? schema.items[index] : schema.items,
        item,
        replace,
        `${path}/${index}`,
      ),
    );
  return value;
}
/** Read persisted references without weakening validation of incoming original facts. */
export function storedSchema(schema: TSchema): TSchema {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!record(value)) return value;
    if (value.secret === true) return Type.Union([schemaOf(value), Type.String({ pattern: referencePattern })]);
    return Object.fromEntries(Reflect.ownKeys(value).map(key => [key, walk(Reflect.get(value, key))]));
  };
  return schemaOf(walk(schema));
}
