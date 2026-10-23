import { freezeDeep } from "../json.ts";
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
  const result=await optimizePrivateAsset(store,reference,original,"image",signal);
  if("media" in result) throw new Error("UNSUPPORTED_IMAGE_ASSET");
  return result;
}
export async function optimizePrivateAsset(store:PrivateAssetStore,reference:string,original:AssetFile,
  media:"image"|"media",signal?:AbortSignal):Promise<PrivateAssetMetadata> {
  const directory = privateAssetStoreDirectory(store);
  return privateImageWork(store.id, async () => {
    const result = freezeDeep(await runImageProcess({ directory, store: store.id, reference, original,...(media==="media"?{media}:{}) }, signal));
    optimized.set(result, { storeId: store.id, reference });
    return result;
  }, signal);
}
