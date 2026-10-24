// The props of SpecimenGroup: the resolved node kind it shows, whether it is hidden, and the heading level it was given.
// Its examples arrive in the `children` slot.
import { Type } from "@sinclair/typebox";
import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";

export const SpecimenGroupContract = {
  props: Type.Object({
    id: Type.Unsafe<ResolvedNodeId>(),
    hidden: Type.Optional(Type.Boolean()),
    headingLevel: Type.Optional(Type.Union([Type.Literal(2), Type.Literal(3)])),
  }, { additionalProperties: false }),
} as const;
