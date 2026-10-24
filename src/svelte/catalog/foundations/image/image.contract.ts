// The props of Image: a public URL or a private asset, its text alternative, the edge it is requested at, how it fits
// its frame, whether its frame shows the muted backdrop, and what it says when it cannot load. `ready` fires once the
// image is decoded and shown, `unavailable` once it shows its fallback instead. Without an image, `placeholder` stands in for it: the glyph of missing video or audio
// artwork, or the `fallback` sentence of unavailable media (which ArtworkPlaceholder drew before slice 3); a placeholder
// always fills its frame.
import { Type } from "@sinclair/typebox";
import { AssetReferenceSchema } from "../../../../assets/types.ts";

export const ImageContract = {
  props: Type.Intersect([Type.Object({
    fallback: Type.Optional(Type.String()),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({
      source: Type.Union([Type.String(), AssetReferenceSchema]),
      alt: Type.String(),
      edge: Type.Optional(Type.Number()),
      zoom: Type.Optional(Type.Number()),
      retry: Type.Optional(Type.Boolean()),
      fit: Type.Optional(Type.Union([Type.Literal("fill"), Type.Literal("fit")])),
      backdrop: Type.Optional(Type.Union([Type.Literal("muted"), Type.Literal("none")])),
      placeholder: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      placeholder: Type.Union([Type.Literal("video"), Type.Literal("audio"), Type.Literal("unavailable")]),
      source: Type.Optional(Type.Undefined()),
      alt: Type.Optional(Type.Undefined()),
      edge: Type.Optional(Type.Undefined()),
      zoom: Type.Optional(Type.Undefined()),
      retry: Type.Optional(Type.Undefined()),
      fit: Type.Optional(Type.Literal("fill")),
      backdrop: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
  ])]),
  events: Type.Object({ ready: Type.Void(), unavailable: Type.Void() }, { additionalProperties: false }),
  marks: ["data-media-image", "data-image-fit", "data-image-state", "data-image-placeholder"],
} as const;
