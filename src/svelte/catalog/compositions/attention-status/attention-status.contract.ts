// The props of AttentionStatus: the attention signals of the current context; it renders nothing when there are none.
import { Type } from "@sinclair/typebox";
import { AttentionSignalSchema } from "../../../../attention.ts";

export const AttentionStatusContract = {
  props: Type.Object({
    signals: Type.Array(AttentionSignalSchema),
  }, { additionalProperties: false }),
} as const;
