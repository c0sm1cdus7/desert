import { Type, type Static } from "@sinclair/typebox";
import type { ObjectDefinition } from "../contracts.ts";
import type { Frozen } from "../json.ts";
import { closed, text } from "../views/definition.ts";
import { FactReferenceSchema, PublishedPresentationSchema } from "../views/object-presentation.ts";
import { FieldRepresentationSchema, supportsFieldRepresentation } from "../field-representation.ts";

export const PublishedFieldSchema = closed({
  fact: FactReferenceSchema, label: text,
  representation: FieldRepresentationSchema,
});
export const AuthoredPublishedPresentationSchema = closed({
  ...PublishedPresentationSchema.properties, fields: Type.Optional(Type.Array(PublishedFieldSchema)),
});
export const HumanReviewSchema = Type.Union([Type.Literal("required"), Type.Literal("confirmation"), Type.Literal("not-required")]);
export type PublishedField = Frozen<Static<typeof PublishedFieldSchema>>;

export function validatePublishedFields(object: Frozen<ObjectDefinition>, fields: readonly PublishedField[]): void {
  const seen = new Set<string>();
  for (const field of fields) {
    if (field.fact.object !== object.id) throw new Error("FOREIGN_PRESENTED_FACT");
    const fact = object.facts[field.fact.field];
    if (!fact) throw new Error("UNKNOWN_PRESENTED_FACT");
    if (seen.has(field.fact.field)) throw new Error("DUPLICATE_PRESENTED_FACT");
    seen.add(field.fact.field);
    if (!supportsFieldRepresentation(fact, field.representation)) {
      throw new Error("INVALID_FACT_REPRESENTATION");
    }
  }
}
