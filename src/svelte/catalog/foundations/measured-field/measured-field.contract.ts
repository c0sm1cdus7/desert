// The props of MeasuredField. `kind` names the control family whose preferred measure the field takes; `invalid` and
// `disabled` mark the field's state for the vendor field it wraps. Its content is the `children` slot.
import { Type } from "@sinclair/typebox";

export const MeasuredFieldContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline"), Type.Literal("control.select"),
      Type.Literal("control.date"), Type.Literal("control.money")]),
    invalid: Type.Optional(Type.Boolean()),
    disabled: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
