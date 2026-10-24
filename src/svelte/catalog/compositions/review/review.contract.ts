// The props of Review: the review content of a frame, the prepared facts and, after an uncertain result, the recovery
// note.
import { Type } from "@sinclair/typebox";
import { FactsSchema } from "../../../../interaction/surface-frame.ts";

export const ReviewContract = {
  props: Type.Object({
    kind: Type.Literal("review"),
    details: FactsSchema,
    recovery: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
} as const;
