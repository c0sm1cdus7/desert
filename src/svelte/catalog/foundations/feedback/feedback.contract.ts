// The props of Feedback: the one sentence it announces as a status.
import { Type } from "@sinclair/typebox";

export const FeedbackContract = {
  props: Type.Object({ text: Type.String() }, { additionalProperties: false }),
} as const;
