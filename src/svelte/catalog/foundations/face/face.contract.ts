// The props of Face: the face itself (an action icon, a document, a status, a short symbol or a region flag, as the
// domain's FaceSchema defines it), whether it shows at its compact size, and the ink its glyph wears when the face is
// not a status (a status glyph wears its severity's ink): the accent (a place to browse) or the positive tone (the
// travel kit). The ink reaches only the glyph (law 9e): the ground and hairline are the same on every face.
import { Type } from "@sinclair/typebox";
import { FaceSchema } from "../../../../interaction/face.ts";

export const FaceContract = {
  props: Type.Object({
    face: FaceSchema,
    compact: Type.Optional(Type.Boolean()),
    ink: Type.Optional(Type.Union([Type.Literal("accent"), Type.Literal("positive")])),
  }, { additionalProperties: false }),
} as const;
