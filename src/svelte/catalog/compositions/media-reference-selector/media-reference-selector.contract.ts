// The props of MediaReferenceSelector: the labels control node that carries a media reference, and its events.
import { Type } from "@sinclair/typebox";
import { LabelsEventSchema, LabelsNodeSchema, ReferenceEventSchema } from "../../../../interaction/labels-control.ts";

export const MediaReferenceSelectorContract = {
  props: Type.Object({ node: LabelsNodeSchema }, { additionalProperties: false }),
  events: Type.Object({ event: Type.Union([LabelsEventSchema, ReferenceEventSchema]) }, { additionalProperties: false }),
} as const;
