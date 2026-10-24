// The props of ArtworkPlaceholder: the kind of media whose cover artwork or poster is missing.
import { Type } from "@sinclair/typebox";

export const ArtworkPlaceholderContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("video"), Type.Literal("audio")]),
  }, { additionalProperties: false }),
} as const;
