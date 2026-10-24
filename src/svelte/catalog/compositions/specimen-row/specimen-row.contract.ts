// The props of SpecimenRow: the bank entry and fixture state it witnesses, whether that state is rendered or a gap,
// and the heading level of its outline. The specimen itself is the `children` slot.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const SpecimenRowContract = {
  props: Type.Object({
    id: ResolvedNodeIdSchema,
    state: Type.String(),
    coverage: Type.Optional(Type.Union([Type.Literal("gap"), Type.Literal("rendered")])),
    divided: Type.Optional(Type.Boolean()),
    headingLevel: Type.Optional(Type.Union([Type.Literal(2), Type.Literal(3)])),
  }, { additionalProperties: false }),
} as const;
