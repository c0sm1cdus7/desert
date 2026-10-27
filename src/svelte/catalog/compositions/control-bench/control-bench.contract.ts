// The props of ControlBench: which control entries it owns (`entryIds`, fixed at mount) and which of them are visible.
// Both default to every control specimen.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const ControlBenchContract = {
  props: Type.Object({
    visibleIds: Type.Optional(Type.Array(ResolvedNodeIdSchema)),
    entryIds: Type.Optional(Type.Array(ResolvedNodeIdSchema)),
  }, { additionalProperties: false }),
} as const;
