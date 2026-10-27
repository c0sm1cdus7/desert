import { Type, type Static } from "@sinclair/typebox";
import { acceptsOnlyImages, mediaKinds, type MediaKind, type MediaType, type RenditionWidth } from "../media/rendition-policy.ts";

/** The value of a file fact: the id of the `asset` object that holds the file (src/assets/object.ts). A fact that accepts
 * only images reads back as the bare reference; any other also names the file's media kind. */
export const AssetReferenceSchema = Type.Object({
  kind: Type.Literal("asset"),
  reference: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" }),
  media: Type.Optional(Type.Union(mediaKinds.map(kind => Type.Literal(kind)))),
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
/** A file kept as uploaded: recognized by its bytes, never by its name or claimed type. */
export type DocumentAssetMetadata = Readonly<{
  original: AssetFile; mediaType: "application/pdf" | "application/zip"; media: "document" | "archive"; renditions: readonly [];
}>;
export type PrivateAssetMetadata = ImageAssetMetadata | PlayableAssetMetadata | DocumentAssetMetadata;
export const assetMediaKind = (metadata: PrivateAssetMetadata): MediaKind => "media" in metadata ? metadata.media : "image";

export function assetReference(reference: string, media?: AssetReference["media"]): AssetReference {
  requireAssetReference(reference);
  return Object.freeze({ kind: "asset", reference, ...(media ? { media } : {}) });
}
/** The value a file fact accepting `accept` holds for a file of `media`. */
export const fileValue = (reference: string, accept: readonly MediaType[], media: MediaKind) =>
  assetReference(reference, acceptsOnlyImages(accept) ? undefined : media);
export function requireAssetReference(reference: string) {
  if (typeof reference !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(reference)) {
    throw new Error("INVALID_ASSET_REFERENCE");
  }
}
