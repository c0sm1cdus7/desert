// The props of FieldWell: the editor it focuses (`id`), its label, whether it holds a value, and its presentation.
// The editor, prefix, accessory and footer are slots.
import { Type } from "@sinclair/typebox";

export const FieldWellContract = {
  props: Type.Object({
    id: Type.String(),
    label: Type.String(),
    filled: Type.Boolean(),
    required: Type.Optional(Type.Boolean()),
    presentation: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("access")])),
  }, { additionalProperties: false }),
} as const;
