// The props of Column. `gap` is a named step of the spacing scale (snug, close, regular, relaxed, section); `measure: "reading"` marks the column for the reading width.
import { Type } from "@sinclair/typebox";

export const ColumnContract = {
  props: Type.Object({
    gap: Type.Union([Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("relaxed"), Type.Literal("section")]),
    measure: Type.Optional(Type.Literal("reading")),
  }, { additionalProperties: false }),
  marks: ["data-reading-measure"],
} as const;
