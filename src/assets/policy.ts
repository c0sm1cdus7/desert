export const imageAssetLimits = Object.freeze({
  originalBytes: 20 * 1024 * 1024,
  renditionBytes: 64 * 1024 * 1024,
  inputPixels: imageInputPixelLimit,
});
export const privateMediaTypes=Object.freeze(["image/jpeg","image/png","image/webp","video/mp4","audio/mp4","audio/mpeg","audio/wav"]);
export type AssetQuota = Readonly<{ totalBytes: number; totalAssets: number; identityBytes: number; identityAssets: number }>;

export function requireAssetQuota(value: AssetQuota): AssetQuota {
  const keys = ["totalBytes", "totalAssets", "identityBytes", "identityAssets"] as const;
  if (!value || Object.keys(value).length !== keys.length || keys.some(key => !Number.isSafeInteger(value[key]) || value[key] <= 0) ||
    value.identityBytes > value.totalBytes || value.identityAssets > value.totalAssets) throw new Error("INVALID_ASSET_QUOTA");
  return Object.freeze(Object.fromEntries(keys.map(key => [key, value[key]])) as AssetQuota);
}
export function assetReservationBytes(originalBytes: number) {
  if (!Number.isSafeInteger(originalBytes) || originalBytes <= 0 || originalBytes > imageAssetLimits.originalBytes) {
    throw new Error("ASSET_SIZE_LIMIT");
  }
  return originalBytes + imageAssetLimits.renditionBytes;
}
import { imageInputPixelLimit } from "../media/rendition-policy.ts";

