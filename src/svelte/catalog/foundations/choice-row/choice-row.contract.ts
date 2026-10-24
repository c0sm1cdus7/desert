// The props of ChoiceRow: the shared id of its row and its control, the ids its label and description carry for
// aria-labelledby/aria-describedby, the visible text, and whether the row reads as disabled. The control is the slot.
import { Type } from "@sinclair/typebox";

export const ChoiceRowContract = {
  props: Type.Object({
    id: Type.String(),
    labelId: Type.String(),
    descriptionId: Type.Optional(Type.String()),
    label: Type.String(),
    description: Type.Optional(Type.String()),
    disabled: Type.Boolean(),
  }, { additionalProperties: false }),
} as const;
