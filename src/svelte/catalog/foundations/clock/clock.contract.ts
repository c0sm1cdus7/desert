// The props of Clock: none. It reads the time itself and formats it in the reader's locale.
import { Type } from "@sinclair/typebox";

export const ClockContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
