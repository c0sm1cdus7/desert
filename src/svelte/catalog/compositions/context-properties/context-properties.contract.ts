// The props of ContextProperties: the facts of one object (its fields, values, labels and reference choices) and the
// state selectors it offers. `select` fires with the journey a selector option starts.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";
import { ObjectSelectorSchema } from "../../../../interaction/surface-frame.ts";

export const ContextPropertiesContract = {
  props: Type.Object({
    fields: Type.Array(Type.String()),
    facts: Type.Record(Type.String(), FactValueSchema),
    object: Type.String(),
    labels: Type.Record(Type.String(), Type.String()),
    references: Type.Optional(Type.Record(Type.String(), Type.Array(ReferenceChoiceSchema))),
    selectors: Type.Optional(Type.Array(ObjectSelectorSchema)),
  }, { additionalProperties: false }),
  events: Type.Object({ select: Type.String() }, { additionalProperties: false }),
} as const;
