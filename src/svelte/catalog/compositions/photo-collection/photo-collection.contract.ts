// The props of PhotoCollection: the photos to page through (a public URL or a private asset, with its text alternative),
// the title of the viewer they open in, whether they head a place, and how each photo fits its frame.
import { Type } from "@sinclair/typebox";
import { AssetReferenceSchema } from "../../../../assets/types.ts";

export const PhotoCollectionContract = {
  props: Type.Object({
    photos: Type.Array(Type.Object({
      source: Type.Union([Type.String(), AssetReferenceSchema]),
      alt: Type.String(),
    }, { additionalProperties: false })),
    title: Type.String(),
    header: Type.Optional(Type.Boolean()),
    fit: Type.Optional(Type.Union([Type.Literal("fit"), Type.Literal("fill")])),
  }, { additionalProperties: false }),
} as const;
