// The props of FactGroup: the facts content of one object without its `kind`. `fields` orders what is shown, `facts`
// holds the values, `labels` the label of each `<object>.<field>`; `images` fields render as images, the rest as rows.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";

export const FactGroupContract = {
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
