// The props of SpecimenUnavailable: the `reason` a bank specimen cannot be executed here.
import { Type } from "@sinclair/typebox";

export const SpecimenUnavailableContract = {
  props: Type.Object({
    reason: Type.String(),
  }, { additionalProperties: false }),
} as const;
