// The props of Spacer: an empty space of one step of the spacing scale, on both axes, or `fill`: the space a row or
// column leaves over, which pushes the pieces after it to the end.
import { Type } from "@sinclair/typebox";

export const SpacerContract = {
  props: Type.Object({
    size: Type.Union([Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("relaxed"), Type.Literal("section"),
      Type.Literal("fill")]),
  }, { additionalProperties: false }),
} as const;
