// The props of ClearInput: the id of the input or textarea it clears, that control's current value (it shows only when
// the value is not empty), its accessible label, and whether clearing is unavailable.
import { Type } from "@sinclair/typebox";

export const ClearInputContract = {
  props: Type.Object({
    control: Type.String(),
    value: Type.String(),
    label: Type.String(),
    disabled: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
