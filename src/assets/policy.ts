import { imageInputPixelLimit } from "../media/rendition-policy.ts";

/** The SDK's ceilings: one file's bytes (a file fact's maxBytes may only lower it), an image's renditions together, and an
 * image's decoded pixels. */
export const fileLimits = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  renditionBytes: 64 * 1024 * 1024,
  inputPixels: imageInputPixelLimit,
});
export type AssetQuota = Readonly<{ totalBytes: number; totalAssets: number; identityBytes: number; identityAssets: number }>;

export function requireAssetQuota(value: AssetQuota): AssetQuota {
  const keys = ["totalBytes", "totalAssets", "identityBytes", "identityAssets"] as const;
  if (!value || Object.keys(value).length !== keys.length || keys.some(key => !Number.isSafeInteger(value[key]) || value[key] <= 0) ||
    value.identityBytes > value.totalBytes || value.identityAssets > value.totalAssets) throw new Error("INVALID_ASSET_QUOTA");
  return Object.freeze(Object.fromEntries(keys.map(key => [key, value[key]])) as AssetQuota);
}
/** What a reservation holds: the declared file (at most the fact's maxBytes) and room for its renditions; completion
 * shrinks it to the bytes written. */
export function assetReservationBytes(originalBytes: number, maxBytes: number = fileLimits.maxBytes) {
  if (!Number.isSafeInteger(originalBytes) || originalBytes <= 0 || originalBytes > Math.min(maxBytes, fileLimits.maxBytes)) {
    throw new Error("ASSET_SIZE_LIMIT");
  }
  return originalBytes + fileLimits.renditionBytes;
}
