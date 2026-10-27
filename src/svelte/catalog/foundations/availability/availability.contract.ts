// The props of Availability: whether a capability is ready, unavailable or not yet known, and the sentence that says so.
// A `compact` availability (a toolbar's) keeps its sentence on one line in a short window, cut with an ellipsis.
import { Type } from "@sinclair/typebox";

export const AvailabilityContract = {
  props: Type.Object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("unknown")]),
    label: Type.String(),
    compact: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
