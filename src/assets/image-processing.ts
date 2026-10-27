import sharp from "sharp";
import { createRendition } from "../build/public-catalog/renditions.ts";
import { renditionsOf } from "../media/rendition-policy.ts";
import { fileLimits } from "./policy.ts";
import type { PrivateAssetStore } from "./storage.ts";
import type { AssetFile, ImageAssetMetadata } from "./types.ts";

const imageTypes = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
export async function optimizeImageBytes(store: PrivateAssetStore, reference: string, original: AssetFile): Promise<ImageAssetMetadata> {
  const bytes = await store.read(reference, "original", original);
  const metadata = await sharp(bytes, { limitInputPixels: fileLimits.inputPixels }).metadata()
    .catch(() => { throw new Error("UNSUPPORTED_IMAGE_ASSET"); });
  if (!Object.hasOwn(imageTypes, metadata.format) || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
    throw new Error("UNSUPPORTED_IMAGE_ASSET");
  }
  const mediaType = imageTypes[metadata.format as keyof typeof imageTypes];
  const rotated = metadata.orientation !== undefined && metadata.orientation >= 5;
  const width = rotated ? metadata.height : metadata.width, height = rotated ? metadata.width : metadata.height;
  let renditionBytes = 0;
  const renditions: ImageAssetMetadata["renditions"][number][] = [];
  for (const edge of renditionsOf(mediaType)) {
    const rendered = await createRendition(bytes, edge).catch(() => { throw new Error("UNSUPPORTED_IMAGE_ASSET"); });
    renditionBytes += rendered.length;
    if (renditionBytes > fileLimits.renditionBytes) throw new Error("ASSET_RENDITION_LIMIT");
    const info = await sharp(rendered).metadata();
    const stored = await store.writeRendition(reference, edge, rendered);
    renditions.push({ ...stored, edge, width: info.width!, height: info.height! });
  }
  return { original, mediaType, width, height, renditions };
}
