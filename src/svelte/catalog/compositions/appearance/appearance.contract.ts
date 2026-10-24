// The props of Appearance: none. It reads and writes the shared appearance state itself.
import { Type } from "@sinclair/typebox";

export const AppearanceContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
