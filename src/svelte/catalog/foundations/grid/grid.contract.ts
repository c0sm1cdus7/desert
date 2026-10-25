// The props of Grid: pieces in auto-fitted tracks. `tracks` is the recipe: media tiles and collection covers (columns of
// at least 18rem), choice cards (at least 8rem), covers (at most three equal columns, each at least a cover wide), or search results (three equal columns, one in a narrow container); `gap` is a step of the spacing scale.
import { Type } from "@sinclair/typebox";
import { GapSchema } from "../../../../interaction/spacing.ts";

export const GridContract = {
  props: Type.Object({
    tracks: Type.Union([Type.Literal("tiles"), Type.Literal("collections"), Type.Literal("cards"), Type.Literal("covers"), Type.Literal("results")]),
    gap: GapSchema,
  }, { additionalProperties: false }),
} as const;
