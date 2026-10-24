// The props of Availability: whether a capability is ready, unavailable or not yet known, and the sentence that says so.
import { Type } from "@sinclair/typebox";

export const AvailabilityContract = {
  props: Type.Object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("unknown")]),
    label: Type.String(),
  }, { additionalProperties: false }),
} as const;
