// The props of Column. `gap` is a named step of the spacing scale (the steps GapSchema names, written here as the variant
// axis); `measure` is the reading width (marked for the place), the narrow width of a centred task such as unlocking, or
// the wide width of an inspection page; `align` places the pieces on the inline axis (stretch when omitted), and
// "center" also centres their text.
import { Type } from "@sinclair/typebox";

export const ColumnContract = {
  props: Type.Object({
    gap: Type.Union([Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("loose"), Type.Literal("relaxed"), Type.Literal("section")]),
    measure: Type.Optional(Type.Union([Type.Literal("reading"), Type.Literal("narrow"), Type.Literal("wide")])),
    align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center"), Type.Literal("stretch")])),
  }, { additionalProperties: false }),
  marks: ["data-reading-measure"],
} as const;
