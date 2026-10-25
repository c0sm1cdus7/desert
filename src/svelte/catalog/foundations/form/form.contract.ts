// The props of Form: its accessible `label`, `submit`, called when it is submitted (the page never reloads), `fill`: the
// form takes the remaining height of its surface as a flex column (a frame's form) instead of a gapped grid, and its `id`,
// the one a bar's submit command names (a bottom pair inside the form submits it).
import { Type } from "@sinclair/typebox";

export const FormContract = {
  props: Type.Object({
    label: Type.String(),
    submit: Type.Function([], Type.Void()),
    fill: Type.Boolean(),
    id: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
} as const;
