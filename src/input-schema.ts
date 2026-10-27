// The closed JSON Schema subset the compiler emits for a field (schema.ts) and the object schema of a journey's input or
// read projection. A contract that carries a journey carries these types, never an open record. Raises INVALID_FIELD_SCHEMA.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/** One field's schema: a string, integer, array or object, with only the keywords schema.ts emits. */
export const InputPropertySchemaSchema = Type.Recursive(Property => Type.Object({
  type: Type.Union([Type.Literal("string"), Type.Literal("integer"), Type.Literal("array"), Type.Literal("object")]),
  const: Type.Optional(Type.String()),
  enum: Type.Optional(Type.Array(Type.String())),
  minLength: Type.Optional(Type.Integer()),
  maxLength: Type.Optional(Type.Integer()),
  pattern: Type.Optional(Type.String()),
  minimum: Type.Optional(Type.Integer()),
  maximum: Type.Optional(Type.Integer()),
  items: Type.Optional(Property),
  maxItems: Type.Optional(Type.Integer()),
  uniqueItems: Type.Optional(Type.Boolean()),
  properties: Type.Optional(Type.Record(Type.String(), Property)),
  required: Type.Optional(Type.Array(Type.String())),
  additionalProperties: Type.Optional(Type.Literal(false)),
}, { additionalProperties: false }));
export type InputPropertySchema = Static<typeof InputPropertySchemaSchema>;

/** A journey's input object (and a read journey's detail and collection projections): closed, every fact required. */
export type JourneyInputSchema = {
  type: "object";
  properties: Record<string, InputPropertySchema>;
  required: string[];
  additionalProperties: false;
};

/** A field schema built from data (a TypeBox schema read back as JSON) narrowed to the emitted subset, or a loud failure. */
export function inputPropertySchema(value: unknown): InputPropertySchema {
  if (Value.Check(InputPropertySchemaSchema, value)) return value;
  throw new Error("INVALID_FIELD_SCHEMA: a field schema left the emitted JSON Schema subset");
}
