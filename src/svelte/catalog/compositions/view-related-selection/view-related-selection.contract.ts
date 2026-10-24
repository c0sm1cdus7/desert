// The props of ViewRelatedSelection: the related selection `state` of a view panel, and `onevent`, raised with the
// node event of each related change or recovery.
import { Type } from "@sinclair/typebox";
import type { RelatedSelectionSnapshot } from "../../../../interaction/related-selection.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const ViewRelatedSelectionContract = {
  props: Type.Object({
    state: Type.Unsafe<RelatedSelectionSnapshot>(),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: NodeEventSchema,
  }, { additionalProperties: false }),
} as const;
