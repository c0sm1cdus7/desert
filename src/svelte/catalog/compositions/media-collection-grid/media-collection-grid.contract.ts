// The props of MediaCollectionGrid: the resolved collection node drawn as a grid of covers, and `select`, called with
// the record id of the collection the person opens.
import { Type } from "@sinclair/typebox";
import { CollectionNodeSchema } from "../../../../interaction/resolved-node-schema.ts";

export const MediaCollectionGridContract = {
  props: Type.Object({
    node: CollectionNodeSchema,
    select: Type.Function([Type.String()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
