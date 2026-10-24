// The props of Column. `gap` is a named step of the spacing scale (snug, close, regular, relaxed, section); `measure`
// is the reading width (marked for the place) or the narrow width of a centred task such as unlocking; `align: "center"`
// centres the pieces and their text.
import { Type } from "@sinclair/typebox";

export const ColumnContract = {
  props: Type.Object({
    gap: Type.Union([Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("relaxed"), Type.Literal("section")]),
    measure: Type.Optional(Type.Union([Type.Literal("reading"), Type.Literal("narrow")])),
    align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center")])),
  }, { additionalProperties: false }),
  marks: ["data-reading-measure"],
} as const;
