// The props of Face: the face itself (an action icon, a document, a status, a short symbol or a region flag, as the
// domain's FaceSchema defines it) and whether it shows at its compact size.
import { Type } from "@sinclair/typebox";
import { FaceSchema } from "../../../../interaction/face.ts";

export const FaceContract = {
  props: Type.Object({
    face: FaceSchema,
    compact: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
