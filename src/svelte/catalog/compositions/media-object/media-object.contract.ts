// The props of MediaObject: the object's facts and the context presentation that names which fact is the media and
// which one describes it.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";

export const MediaObjectContract = {
  props: Type.Object({
    facts: Type.Record(Type.String(), FactValueSchema),
    presentation: Type.Object({
      kind: Type.Literal("media-object"), media: Type.String(), description: Type.Optional(Type.String()),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
} as const;
