import { freezeDeep } from "../json.ts";
import { imageMediaTypes, type MediaType } from "../media/rendition-policy.ts";
import { privateAssetStoreDirectory, type PrivateAssetStore } from "./storage.ts";
import { privateImageWork } from "./work.ts";
import { runImageProcess } from "./image-process.ts";
import type { AssetFile, ImageAssetMetadata, PrivateAssetMetadata } from "./types.ts";

const optimized = new WeakMap<PrivateAssetMetadata, { storeId: string; reference: string }>();

export function requireOptimizedImage(image: PrivateAssetMetadata, storeId: string, reference: string) {
  const issued = optimized.get(image);
  if (!issued || issued.storeId !== storeId || issued.reference !== reference) throw new Error("UNVERIFIED_IMAGE_ASSET");
}

export async function optimizePrivateImage(store: PrivateAssetStore, reference: string, original: AssetFile,
  signal?: AbortSignal): Promise<ImageAssetMetadata> {
  const result = await optimizePrivateAsset(store, reference, original, imageMediaTypes, signal);
  if ("media" in result) throw new Error("UNSUPPORTED_IMAGE_ASSET");
  return result;
}
/** Processes a stored original in the media worker for a fact that accepts `accept` (src/assets/file-processing.ts). */
export async function optimizePrivateAsset(store: PrivateAssetStore, reference: string, original: AssetFile,
  accept: readonly MediaType[], signal?: AbortSignal): Promise<PrivateAssetMetadata> {
  const directory = privateAssetStoreDirectory(store);
  return privateImageWork(store.id, async () => {
    const result = freezeDeep(await runImageProcess({ directory, store: store.id, reference, original, accept: [...accept] }, signal));
    optimized.set(result, { storeId: store.id, reference });
    return result;
  }, signal);
}
