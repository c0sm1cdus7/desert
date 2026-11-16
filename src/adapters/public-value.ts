import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { AdapterFailure } from "../tools/adapter-contract.ts";
/** Copy data without calling accessors, toJSON, or carrying prototypes, errors or capabilities across. */
export function publicValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(publicValue);
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype)
    throw new AdapterFailure("E-ADAPTER-OUTPUT");
  return Object.fromEntries(
    Reflect.ownKeys(value).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== "string" || !descriptor || !("value" in descriptor))
        throw new AdapterFailure("E-ADAPTER-OUTPUT");
      return [key, publicValue(descriptor.value)];
    }),
  );
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
function schemaCopy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(schemaCopy);
  if (!object(value)) return value;
  return Object.fromEntries(Reflect.ownKeys(value).map(key => [key, schemaCopy(Reflect.get(value, key))]));
}
/** Every object is closed; unconstrained schemas cannot describe a public operation. */
export function publicSchema(schema: TSchema): TSchema {
  const walk = (schema: unknown): object => {
    if (!object(schema)) throw new AdapterFailure("E-ADAPTER-DECLARATION");
    const { type, anyOf, properties, items } = schema;
    if (
      !Array.isArray(anyOf) &&
      !["string", "number", "integer", "boolean", "null", "array", "object"].includes(String(type))
    )
      throw new AdapterFailure("E-ADAPTER-DECLARATION");
    if (schema.patternProperties || schema.$ref || schema.allOf || schema.not)
      throw new AdapterFailure("E-ADAPTER-DECLARATION");
    return {
      ...schema,
      ...(Array.isArray(anyOf) ? { anyOf: anyOf.map(walk) } : {}),
      ...(type === "object"
        ? {
            additionalProperties: false,
            properties: Object.fromEntries(
              Object.entries(object(properties) ? properties : {}).map(([key, child]) => [key, walk(child)]),
            ),
          }
        : {}),
      ...(type === "array" ? { items: walk(items) } : {}),
    };
  };
  const safe = Type.Unsafe(walk(schemaCopy(schema)));
  try {
    Value.Check(safe, null);
  } catch {
    throw new AdapterFailure("E-ADAPTER-DECLARATION");
  }
  return safe;
}
