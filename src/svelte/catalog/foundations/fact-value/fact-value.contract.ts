// The props of FactValue: one scalar fact; null or absent reads as unknown, blank text as empty.
import { Type } from "@sinclair/typebox";

export const FactValueContract = {
  props: Type.Object({
    value: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
  }, { additionalProperties: false }),
} as const;
