// The props of LabelRail. `values` are the selected labels; `disabled` turns their remove buttons off; `remove` reports
// the index of the label the person removes (only offered when the owner listens).
import { Type } from "@sinclair/typebox";

export const LabelRailContract = {
  props: Type.Object({
    values: Type.Array(Type.String()),
    disabled: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({ remove: Type.Number() }, { additionalProperties: false }),
} as const;
