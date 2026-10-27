// The media a viewer shows and a player plays, as closed schemas: the media-player and media-viewer contracts reference
// them, and ViewerMedia (media-source.ts) is their static type. A source is a public URL or a private asset.
import { Type, type Static } from "@sinclair/typebox";
import { AssetReferenceSchema } from "../../assets/types.ts";

const closed = { additionalProperties: false } as const;
export const MediaSourceSchema = Type.Union([Type.String(), AssetReferenceSchema]);
export const CaptionTrackSchema = Type.Object({ source: Type.String(), language: Type.String(), label: Type.String() }, closed);
export const PlayableMediaSchema = Type.Object({
  kind: Type.Union([Type.Literal("video"), Type.Literal("audio")]),
  source: MediaSourceSchema,
  alt: Type.String(),
  artwork: Type.Optional(Type.Object({ source: Type.String(), alt: Type.String() }, closed)),
  captions: Type.Array(CaptionTrackSchema),
}, closed);
export const ViewerMediaSchema = Type.Union([
  Type.Object({ kind: Type.Literal("image"), source: MediaSourceSchema, alt: Type.String() }, closed),
  PlayableMediaSchema,
]);
export type PlayableMedia = Static<typeof PlayableMediaSchema>;
