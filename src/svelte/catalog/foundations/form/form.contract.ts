// The props of Form: its accessible `label`, and `submit`, called when it is submitted (the page never reloads).
import { Type } from "@sinclair/typebox";

export const FormContract = {
  props: Type.Object({
    label: Type.String(),
    submit: Type.Function([], Type.Void()),
  }, { additionalProperties: false }),
} as const;
