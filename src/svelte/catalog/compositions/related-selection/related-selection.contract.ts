// The props of RelatedSelection: the `state` of each related group, and `onevent`, raised when an item is checked or
// unchecked (related.change) or a failed group is retried (related.recover).
import { Type } from "@sinclair/typebox";
import { RelatedSelectionEventSchema, type RelatedSelectionSnapshot } from "../../../../interaction/related-selection.ts";

export const RelatedSelectionContract = {
  props: Type.Object({
    state: Type.Unsafe<RelatedSelectionSnapshot>(),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: RelatedSelectionEventSchema,
  }, { additionalProperties: false }),
} as const;
