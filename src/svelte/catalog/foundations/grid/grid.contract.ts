// The props of Grid: pieces in auto-fitted tracks. `tracks` is the recipe: media tiles and collection covers (columns of
// at least 18rem), choice cards (at least 8rem) or three equal covers; `gap` is a step of the spacing scale.
import { Type } from "@sinclair/typebox";
import { GapSchema } from "../../../../interaction/spacing.ts";

export const GridContract = {
  props: Type.Object({
    tracks: Type.Union([Type.Literal("tiles"), Type.Literal("collections"), Type.Literal("cards"), Type.Literal("covers")]),
    gap: GapSchema,
  }, { additionalProperties: false }),
} as const;
