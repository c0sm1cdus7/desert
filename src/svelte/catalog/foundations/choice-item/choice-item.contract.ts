// The props of ChoiceItem: the label and optional description of one choice, with the ids its host control references.
// The selection mark and any leading artwork arrive through the `children` slot.
import { Type } from "@sinclair/typebox";

export const ChoiceItemContract = {
  props: Type.Object({
    label: Type.String(),
    labelId: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    descriptionId: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
} as const;
