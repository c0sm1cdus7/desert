// The props of SummaryWidget: the resolved collection node whose summary-widget presentation it counts, `activate`
// called when the widget is pressed to open its destination, and `available` (default true) to disable it.
import { Type } from "@sinclair/typebox";
import { CollectionNodeSchema } from "../../../../interaction/resolved-node-schema.ts";

export const SummaryWidgetContract = {
  props: Type.Object({
    node: CollectionNodeSchema,
    activate: Type.Function([], Type.Void()),
    available: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
