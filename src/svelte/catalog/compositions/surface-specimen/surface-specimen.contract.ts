// The props of SurfaceSpecimen: none. It builds its own example frames and owns its transient's open state.
import { Type } from "@sinclair/typebox";

export const SurfaceSpecimenContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
