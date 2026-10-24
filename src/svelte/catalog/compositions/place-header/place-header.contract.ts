// The props of PlaceHeader: the place's title and subtitle, and an optional background image (a media asset and its alt).
import { Type } from "@sinclair/typebox";

export const PlaceHeaderContract = {
  props: Type.Object({
    title: Type.String(),
    subtitle: Type.String(),
    background: Type.Optional(Type.Object({ asset: Type.String(), alt: Type.String() }, { additionalProperties: false })),
  }, { additionalProperties: false }),
} as const;
