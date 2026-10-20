import { Type, type Static } from "@sinclair/typebox";
import { JourneySchema, PolicySchema, SurfaceSchema } from "./program-grammar.ts";
import { DependencySchema } from "./dependencies.ts";

const TextField = Type.Object({
  kind: Type.Literal("text"),
  minLength: Type.Optional(Type.Integer({ minimum: 0 })),
  maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
}, { additionalProperties: false });

const IntegerField = Type.Object({
  kind: Type.Literal("integer"),
  minimum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
  maximum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
}, { additionalProperties: false });

const PrincipalField = Type.Object({ kind: Type.Literal("principal") }, { additionalProperties: false });
const EnumField = Type.Object({ kind: Type.Literal("enum"), values: Type.Array(Type.String({ minLength: 1 }), {
  minItems: 1, uniqueItems: true,
}) }, { additionalProperties: false });
const Field = Type.Union([TextField, IntegerField, PrincipalField, EnumField]);
const ObjectDefinition = Type.Object({
  id: Type.String({ minLength: 1 }),
  facts: Type.Record(Type.String({ minLength: 1 }), Field, { minProperties: 1, additionalProperties: false }),
}, { additionalProperties: false });

export const ProductDefinitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  objects: Type.Array(ObjectDefinition, { minItems: 1 }),
  policies: Type.Optional(Type.Array(PolicySchema)),
  journeys: Type.Optional(Type.Array(JourneySchema)),
  surfaces: Type.Optional(Type.Array(SurfaceSchema)),
  dependencies: Type.Optional(Type.Array(DependencySchema)),
}, { additionalProperties: false });

export type FieldDefinition = Static<typeof Field>;
export type ObjectDefinition = Static<typeof ObjectDefinition>;
export type ProductDefinition = Static<typeof ProductDefinitionSchema>;

export function text(options: Omit<Static<typeof TextField>, "kind"> = {}): Static<typeof TextField> {
  return { ...options, kind: "text" };
}

export function integer(options: Omit<Static<typeof IntegerField>, "kind"> = {}): Static<typeof IntegerField> {
  return { ...options, kind: "integer" };
}

export function principal(): Static<typeof PrincipalField> { return { kind: "principal" }; }
export function enumeration<const V extends [string, ...string[]]>(values: V) {
  return { kind: "enum" as const, values };
}
export function objectType<const O extends ObjectDefinition>(definition: O): O { return definition; }
export function product<const P extends ProductDefinition>(definition: P): P { return definition; }
