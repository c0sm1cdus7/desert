// Two schemas: material belongs to the base; the program sees references and public fields.
import { isRecord } from "../../fields/json-values.ts";
import { isImmutableSchema } from "../../fields/schema-shape.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import { Type, type TSchema, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
/** The complete spelling of an opaque secret reference. */
export const referencePattern = "^secret:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
const executionSchemas = new WeakMap<TSchema, TSchema>();
const secretInputs = new WeakMap<object, boolean>();

export function executionSchema<S extends TSchema>(schema: S) {
  const known = executionSchemas.get(schema);
  if (known) return Type.Unsafe<Static<S>>(known);
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!isRecord(value)) return value;
    if (value.secret === true) return Type.String({ secret: true, pattern: referencePattern, wrong: value.wrong });
    return Object.fromEntries(Reflect.ownKeys(value).map(key => [key, walk(Reflect.get(value, key))]));
  };
  const result = walk(schema);
  const prepared = Type.Unsafe<Static<S>>(isRecord(result) ? result : {});
  if (isImmutableSchema(schema)) {
    deepFreeze(prepared);
    executionSchemas.set(schema, prepared);
  }
  return prepared;
}
/** Whether an object schema contains a field marked as secret. */
export function hasSecretInput(schema: unknown): boolean {
  if (!isRecord(schema)) return false;
  const known = secretInputs.get(schema);
  if (known !== undefined) return known;
  const secret =
    schema.secret === true ||
    Object.values(schema).some(child => (Array.isArray(child) ? child.some(hasSecretInput) : hasSecretInput(child)));
  if (isImmutableSchema(schema)) secretInputs.set(schema, secret);
  return secret;
}
export function validMaterial(schema: unknown, value: unknown, refs: ReadonlySet<string> = new Set()): boolean {
  if (!isRecord(schema) || !hasSecretInput(schema)) return true;
  if (schema.secret === true)
    return (typeof value === "string" && refs.has(value)) || Value.Check(Type.Unsafe(schema), value);
  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter(
      arm =>
        isRecord(arm) &&
        (Value.Check(Type.Unsafe(arm), value) || Value.Check(executionSchema(Type.Unsafe(arm)), value)),
    );
    return matches.length > 0 && matches.every(arm => validMaterial(arm, value, refs));
  }
  if (isRecord(schema.properties) && isRecord(value))
    return Object.entries(schema.properties).every(
      ([key, child]) => !Object.hasOwn(value, key) || validMaterial(child, value[key], refs),
    );
  if (schema.items && Array.isArray(value))
    return value.every((item, index) =>
      validMaterial(Array.isArray(schema.items) ? schema.items[index] : schema.items, item, refs),
    );
  return true;
}
// Only an object handed on by the base's question reader can carry material behind its public references.
const answered = new WeakMap<object, ReadonlyMap<string, string>>();
export function answeredInput<T>(input: T, material: ReadonlyMap<string, string>): T {
  if (input && typeof input === "object") answered.set(input, new Map(material));
  return input;
}
export function incomingMaterial(input: unknown, schema: unknown): unknown {
  const material = input && typeof input === "object" ? answered.get(input) : undefined;
  if (!material) return input;
  if (input && typeof input === "object") answered.delete(input);
  const walk = (shape: unknown, value: unknown): unknown => {
    if (!isRecord(shape)) return value;
    if (shape.secret === true && typeof value === "string") return material.get(value) ?? value;
    if (Array.isArray(shape.anyOf)) {
      const arm: unknown = shape.anyOf.find(
        arm => isRecord(arm) && Value.Check(executionSchema(Type.Unsafe(arm)), value),
      );
      return walk(arm, value);
    }
    if (Array.isArray(value) && shape.items)
      return value.map((item, index) => walk(Array.isArray(shape.items) ? shape.items[index] : shape.items, item));
    if (isRecord(value) && isRecord(shape.properties)) {
      const result = { ...value };
      for (const [key, child] of Object.entries(shape.properties))
        if (Object.hasOwn(value, key)) result[key] = walk(child, value[key]);
      return result;
    }
    return value;
  };
  return walk(schema, input);
}

export function replaced<T>(original: T, value: unknown): T {
  const wrapper = { value: original };
  Object.defineProperty(wrapper, "value", { value });
  return wrapper.value;
}
