// The props of GroupedPanel: its measure, a reading column or the full overview width. Its rows are the `children` slot.
import { Type } from "@sinclair/typebox";

export const GroupedPanelContract = {
  props: Type.Object({
    measure: Type.Optional(Type.Union([Type.Literal("reading"), Type.Literal("overview")])),
  }, { additionalProperties: false }),
} as const;
