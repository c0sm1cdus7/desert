// The props of Separator: a hairline in the theme's separator ink between two pieces of a column (horizontal) or a row
// (vertical). `inset: "row"` starts it where grouped rows start their content.
import { Type } from "@sinclair/typebox";

export const SeparatorContract = {
  props: Type.Object({
    orientation: Type.Union([Type.Literal("horizontal"), Type.Literal("vertical")]),
    inset: Type.Union([Type.Literal("none"), Type.Literal("row")]),
  }, { additionalProperties: false }),
} as const;
