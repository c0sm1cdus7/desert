// The props of LabelsControl: the labels control node, and its labels and reference events.
import { Type } from "@sinclair/typebox";
import { LabelsEventSchema, LabelsNodeSchema, ReferenceEventSchema } from "../../../../interaction/labels-control.ts";

export const LabelsControlContract = {
  props: Type.Object({ node: LabelsNodeSchema }, { additionalProperties: false }),
  events: Type.Object({ event: Type.Union([LabelsEventSchema, ReferenceEventSchema]) }, { additionalProperties: false }),
} as const;
