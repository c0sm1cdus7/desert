// The props of Image: a public URL or a private asset, its text alternative, the edge it is requested at, how it fits
// its frame, and what it says when it cannot load. `ready` fires once the image is decoded and shown.
import { Type } from "@sinclair/typebox";
import { AssetReferenceSchema } from "../../../../assets/types.ts";

export const ImageContract = {
  props: Type.Object({
    source: Type.Union([Type.String(), AssetReferenceSchema]),
    alt: Type.String(),
    edge: Type.Optional(Type.Number()),
    zoom: Type.Optional(Type.Number()),
    retry: Type.Optional(Type.Boolean()),
    fit: Type.Optional(Type.Union([Type.Literal("fill"), Type.Literal("fit")])),
    fallback: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
  events: Type.Object({ ready: Type.Null() }, { additionalProperties: false }),
} as const;
