// The props of Form: its accessible `label`, `submit`, called when it is submitted (the page never reloads), and
// `fill`: the form takes the remaining height of its surface as a flex column (a frame's form) instead of a gapped grid.
import { Type } from "@sinclair/typebox";

export const FormContract = {
  props: Type.Object({
    label: Type.String(),
    submit: Type.Function([], Type.Void()),
    fill: Type.Boolean(),
  }, { additionalProperties: false }),
} as const;
