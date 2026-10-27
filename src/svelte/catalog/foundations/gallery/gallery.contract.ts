// The props of Gallery: the photos it pages through (a public URL or a private asset, with its text alternative), the
// title of the viewer they open in, where it sits (inline in a page, heading a place, or as a detail's photograph), how
// each photo fits its frame, and the frame's aspect (filling its host, or square, landscape or portrait).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { MediaSourceSchema } from "../../../infra/viewer-media.ts";

export const GalleryContract = {
  props: Type.Object({
    photos: Type.Array(Type.Object({ source: MediaSourceSchema, alt: Type.String() }, { additionalProperties: false }), { minItems: 1 }),
    title: text,
    presentation: Type.Union([Type.Literal("inline"), Type.Literal("header"), Type.Literal("detail")]),
    fit: Type.Union([Type.Literal("fill"), Type.Literal("fit")]),
    aspect: Type.Union([Type.Literal("fill"), Type.Literal("square"), Type.Literal("landscape"), Type.Literal("portrait")]),
  }, { additionalProperties: false }),
  marks: ["data-photo-collection", "data-header-collection", "data-media-open", "data-media-dots"],
} as const;
