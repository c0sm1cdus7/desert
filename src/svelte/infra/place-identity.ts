// Renderer-owned content identity, independent of chrome and device names: a place's title, subtitle and the featured
// image, gallery or video its heading shows. PlaceHeading's contract references FeaturedMediaSchema.
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../../json.ts";

const closed = { additionalProperties: false } as const;
const asset = { asset: Type.String(), alt: Type.String() };
export const FeaturedMediaSchema = Type.Union([
  Type.Object({ kind: Type.Literal("image"), ...asset }, closed),
  Type.Object({ kind: Type.Literal("video"), ...asset, poster: Type.Optional(Type.String()) }, closed),
  Type.Object({ kind: Type.Literal("gallery"), images: Type.Array(Type.Object(asset, closed)) }, closed),
]);
export type FeaturedMedia = Frozen<Static<typeof FeaturedMediaSchema>>;

export interface PlaceIdentity {
  title: string;
  subtitle: string;
  media?: FeaturedMedia;
}
