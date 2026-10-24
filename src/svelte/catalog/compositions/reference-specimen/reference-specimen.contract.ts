// The props of ReferenceSpecimen: which labels or reference owner to exercise locally in the bank.
import { Type } from "@sinclair/typebox";

export const ReferenceSpecimenContract = {
  props: Type.Object({
    owner: Type.Union([Type.Literal("LabelRail"), Type.Literal("ColorBullet"), Type.Literal("ReferenceValues"),
      Type.Literal("ReferenceSelector"), Type.Literal("LabelsControl")]),
  }, { additionalProperties: false }),
} as const;
