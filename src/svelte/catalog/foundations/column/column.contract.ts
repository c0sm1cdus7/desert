// The props of Column. `gap` is a named step of the spacing scale (the steps GapSchema names, written here as the variant
// axis); `measure` is the reading width (marked for the place), the narrow width of a centred task such as unlocking, or
// the wide width of an inspection page; `align` places the pieces on the inline axis (stretch when omitted), and
// "center" also centres their text. `inset` places the column inside a place: "content" at the place's content inset (a
// rail title over a rail that bleeds to the surface), "reading" as a document's reading block (its block padding, and the
// content inset less the 1rem row inset its stack layouts and items already carry), "section" with a place section's block
// padding (a catalog's rails under its featured entry or its place heading); `leading` adds the place's leading inset (the
// docked navigation's width) at the start, for a column that is the place's own content.
import { Type } from "@sinclair/typebox";

export const ColumnContract = {
  props: Type.Object({
    gap: Type.Union([Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("relaxed"), Type.Literal("section")]),
    measure: Type.Optional(Type.Union([Type.Literal("reading"), Type.Literal("narrow"), Type.Literal("wide")])),
    align: Type.Optional(Type.Union([Type.Literal("start"), Type.Literal("center"), Type.Literal("stretch")])),
    inset: Type.Optional(Type.Union([Type.Literal("content"), Type.Literal("reading"), Type.Literal("section")])),
    leading: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  marks: ["data-reading-measure"],
} as const;
