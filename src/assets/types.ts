import { Type, type Static } from "@sinclair/typebox";
import type { RenditionWidth } from "../media/rendition-policy.ts";

export const AssetReferenceSchema = Type.Object({
  kind: Type.Literal("asset"),
  reference: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" }),
  media: Type.Optional(Type.Union([Type.Literal("image"),Type.Literal("video"),Type.Literal("audio")])),
}, { additionalProperties: false });
export type AssetReference = Readonly<Static<typeof AssetReferenceSchema>>;
export type AssetImageVariant = "original" | RenditionWidth;
export type AssetImageStatus = Readonly<{ state: "reserved" | "uploading" | "failed" }> |
  Readonly<{ state: "ready" | "attached"; asset: AssetReference }>;
export type AssetEvidence = Readonly<{ inputField: string; objectField: string; reference: string; metadataDigest: string }>;
export type AssetFile = Readonly<{ size: number; digest: string }>;
export type ImageAssetMetadata = Readonly<{
  original: AssetFile;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  renditions: readonly Readonly<AssetFile & { width: number; height: number; edge: RenditionWidth }>[];
}>;

export type PlayableAssetMetadata = Readonly<{
  original:AssetFile; mediaType:"video/mp4"|"audio/mp4"|"audio/mpeg"|"audio/wav";
  media:"video"|"audio"; duration:number; width?:number; height?:number; renditions:readonly [];
}>;
export type PrivateAssetMetadata = ImageAssetMetadata | PlayableAssetMetadata;
export const assetMediaKind = (metadata:PrivateAssetMetadata):"image"|"video"|"audio" => "media" in metadata ? metadata.media : "image";

export function assetReference(reference: string, media?:AssetReference["media"]): AssetReference {
  requireAssetReference(reference);
  return Object.freeze({ kind: "asset", reference, ...(media?{media}:{}) });
}
export function requireAssetReference(reference: string) {
  if (typeof reference !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(reference)) {
    throw new Error("INVALID_ASSET_REFERENCE");
  }
}
