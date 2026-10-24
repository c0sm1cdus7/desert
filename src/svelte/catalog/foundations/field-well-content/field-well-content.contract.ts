// The props of FieldWellContent: the persistent label of a field well; `id` names the editor it labels (absent when the
// well is a button that owns its text). The editor or value is the `children` slot.
import { Type } from "@sinclair/typebox";

export const FieldWellContentContract = {
  props: Type.Object({
    id: Type.Optional(Type.String()),
    label: Type.String(),
    required: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
