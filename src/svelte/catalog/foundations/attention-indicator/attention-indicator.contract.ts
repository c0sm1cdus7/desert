// The props of AttentionIndicator: whether the object requires attention, and whether the dot sits in the flow or over
// the corner of its well.
import { Type } from "@sinclair/typebox";

export const AttentionIndicatorContract = {
  props: Type.Object({
    required: Type.Boolean(),
    placement: Type.Optional(Type.Union([Type.Literal("inline"), Type.Literal("overlay")])),
  }, { additionalProperties: false }),
} as const;
