// The props of ContextPanel: the object's facts (fields, values, labels, and which fields read as prose, images, tags or
// references), its attention signals, an optional media presentation, its state selectors and its contextual actions.
// It emits `select` with the journey a state selector chose.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";
import { AttentionSignalSchema } from "../../../../attention.ts";
import { ObjectSelectorSchema } from "../../../../interaction/surface-frame.ts";

export const ContextPanelContract = {
  props: Type.Object({
    fields: Type.Array(Type.String()),
    facts: Type.Record(Type.String(), FactValueSchema),
    object: Type.String(),
    labels: Type.Record(Type.String(), Type.String()),
    multiline: Type.Optional(Type.Array(Type.String())),
    images: Type.Optional(Type.Array(Type.String())),
    tags: Type.Optional(Type.Array(Type.String())),
    references: Type.Optional(Type.Record(Type.String(), Type.Array(ReferenceChoiceSchema))),
    attention: Type.Optional(Type.Array(AttentionSignalSchema)),
    presentation: Type.Optional(Type.Object({
      kind: Type.Literal("media-object"), media: Type.String(), description: Type.Optional(Type.String()),
    }, { additionalProperties: false })),
    selectors: Type.Optional(Type.Array(ObjectSelectorSchema)),
    actions: Type.Array(Type.Object({
      id: Type.String(), label: Type.String(), available: Type.Boolean(), invoke: Type.Function([], Type.Void()),
    }, { additionalProperties: false })),
  }, { additionalProperties: false }),
  events: Type.Object({ select: Type.String() }, { additionalProperties: false }),
} as const;
