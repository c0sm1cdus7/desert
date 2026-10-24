// The props of MediaReferenceSpecimen: none. It is a self-contained bank witness of the media reference selector.
import { Type } from "@sinclair/typebox";

export const MediaReferenceSpecimenContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
