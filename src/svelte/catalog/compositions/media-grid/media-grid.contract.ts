// The props of MediaGrid: a resolved collection presented as media (grid tiles or list rows) and how to open one of its
// records by id.
import { Type } from "@sinclair/typebox";
import { CollectionNodeSchema } from "../../../../interaction/resolved-node-schema.ts";

export const MediaGridContract = {
  props: Type.Object({
    node: CollectionNodeSchema,
    select: Type.Function([Type.String()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
