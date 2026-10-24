// The props of Text. `inset: "row"` aligns the paragraph with the content of grouped rows.
import { Type } from "@sinclair/typebox";

export const TextContract = {
  props: Type.Object({
    text: Type.String(),
    kind: Type.Literal("body"),
    inset: Type.Union([Type.Literal("none"), Type.Literal("row")]),
  }, { additionalProperties: false }),
} as const;
