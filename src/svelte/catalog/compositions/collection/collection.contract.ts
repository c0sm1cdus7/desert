// The props of Collection: the resolved collection `node` (records, fields, labels and an optional media presentation)
// and `select`, called with the id of the record a row opens.
import { Type } from "@sinclair/typebox";
import type { ResolvedNodeFor } from "../../../../interaction/resolved-node.ts";

export const CollectionContract = {
  props: Type.Object({
    node: Type.Unsafe<ResolvedNodeFor<"collection">>(),
    select: Type.Function([Type.String()], Type.Void()),
  }, { additionalProperties: false }),
} as const;
