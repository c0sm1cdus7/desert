// The props of SpecimenGroup: the resolved node kind it shows and whether it is hidden. Its examples arrive in the
// `children` slot.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const SpecimenGroupContract = {
  props: Type.Object({
    id: ResolvedNodeIdSchema,
    hidden: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
