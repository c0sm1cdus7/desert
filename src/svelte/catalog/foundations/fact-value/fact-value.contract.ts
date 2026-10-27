// The props of FactValue: one scalar fact (null or absent reads as unknown, blank text as empty) and its presentation:
// inline in a row, or a paragraph of reading copy (a long text fact, at the body role).
import { Type } from "@sinclair/typebox";

export const FactValueContract = {
  props: Type.Object({
    value: Type.Optional(Type.Union([Type.String(), Type.Number(), Type.Null()])),
    presentation: Type.Optional(Type.Union([Type.Literal("inline"), Type.Literal("paragraph")])),
  }, { additionalProperties: false }),
  marks: ["data-fact-state", "data-fact-presentation"],
} as const;
