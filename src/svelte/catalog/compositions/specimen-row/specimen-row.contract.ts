// The props of SpecimenRow: the bank entry and fixture state it witnesses, and the heading level of its outline. The
// specimen itself is the `children` slot; a specimen that cannot run here is a SpecimenUnavailable note.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const SpecimenRowContract = {
  props: Type.Object({
    id: ResolvedNodeIdSchema,
    state: Type.String(),
    headingLevel: Type.Optional(Type.Union([Type.Literal(2), Type.Literal(3)])),
  }, { additionalProperties: false }),
} as const;
