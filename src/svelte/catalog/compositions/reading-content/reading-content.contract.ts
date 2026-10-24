// The props of ReadingContent: the fields of one object to read as paragraphs, their values and their labels.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";

export const ReadingContentContract = {
  props: Type.Object({
    fields: Type.Array(Type.String()),
    facts: Type.Record(Type.String(), FactValueSchema),
    object: Type.String(),
    labels: Type.Record(Type.String(), Type.String()),
  }, { additionalProperties: false }),
} as const;
