// The props of ReferenceSelector: the labels control node it edits. It reports a labels change or a reference request
// (create, refresh, recover) through `onevent`.
import { Type } from "@sinclair/typebox";
import { LabelsEventSchema, LabelsNodeSchema, ReferenceEventSchema } from "../../../../interaction/labels-control.ts";

export const ReferenceSelectorContract = {
  props: Type.Object({
    node: LabelsNodeSchema,
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Union([LabelsEventSchema, ReferenceEventSchema]),
  }, { additionalProperties: false }),
} as const;
