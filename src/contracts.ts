import { Type, type Static } from "@sinclair/typebox";
import { JourneySchema, PolicySchema, ExposureSchema } from "./program-grammar.ts";
import { DependencySchema } from "./dependencies.ts";
import { FieldDefinitionSchema } from "./field-definition.ts";
export { text, integer, principal, enumeration, imageAsset, mediaAsset, labels, references, namedReferences, mediaReferences, type FieldDefinition } from "./field-definition.ts";
const ObjectDefinition = Type.Object({
  id: Type.String({ minLength: 1 }),
  facts: Type.Record(Type.String({ minLength: 1 }), FieldDefinitionSchema, { minProperties: 1, additionalProperties: false }),
}, { additionalProperties: false });

export const ProductDefinitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  objects: Type.Array(ObjectDefinition, { minItems: 1 }),
  policies: Type.Optional(Type.Array(PolicySchema)),
  journeys: Type.Optional(Type.Array(JourneySchema)),
  surfaces: Type.Optional(Type.Array(ExposureSchema)),
  dependencies: Type.Optional(Type.Array(DependencySchema)),
}, { additionalProperties: false });

export type ObjectDefinition = Static<typeof ObjectDefinition>;
export type ProductDefinition = Static<typeof ProductDefinitionSchema>;

export function objectType<const O extends ObjectDefinition>(definition: O): O { return definition; }
export function product<const P extends ProductDefinition>(definition: P): P { return definition; }
