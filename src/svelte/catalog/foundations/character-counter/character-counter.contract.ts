// The props of CharacterCounter: the id that describes its input, the value being counted, and the optional limit.
import { Type } from "@sinclair/typebox";

export const CharacterCounterContract = {
  props: Type.Object({
    id: Type.String(),
    value: Type.String(),
    maxLength: Type.Optional(Type.Number()),
  }, { additionalProperties: false }),
} as const;
