// The props of Facts: a facts body without its kind: which fields to read, their values and labels, and which fields
// are multiline, images, tags or references.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";

export const FactsContract = {
  props: Type.Object({
    object: Type.String(),
    fields: Type.Array(Type.String()),
    facts: Type.Record(Type.String(), FactValueSchema),
    labels: Type.Record(Type.String(), Type.String()),
    multiline: Type.Optional(Type.Array(Type.String())),
    images: Type.Optional(Type.Array(Type.String())),
    tags: Type.Optional(Type.Array(Type.String())),
    references: Type.Optional(Type.Record(Type.String(), Type.Array(ReferenceChoiceSchema))),
  }, { additionalProperties: false }),
} as const;
