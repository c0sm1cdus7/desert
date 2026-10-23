import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve, join, extname, isAbsolute } from "node:path";
import { hash } from "../files.ts";

export type CatalogAssetBinding = Readonly<{ id: string; path: string; alt: string }>;
export type BoundCatalogAsset = Readonly<{
  id: string; file: string; digest: string; size: number; mediaType: string;
}>;
export const catalogMediaTypes: Readonly<Record<string, string>> = Object.freeze({
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".vtt": "text/vtt",
});

/** Host-owned file bindings never enter the portable surface or downloadable build. */
export function bindCatalogAssets(sourceRoot: string, assets: readonly CatalogAssetBinding[]): readonly BoundCatalogAsset[] {
  const root = realpathSync(resolve(sourceRoot));
  if (!lstatSync(root).isDirectory()) throw new Error("CATALOG_MEDIA_ROOT_REQUIRED");
  const identities = new Set<string>();
  return Object.freeze(assets.map(asset => {
    if (identities.has(asset.id)) throw new Error("DUPLICATE_CATALOG_MEDIA");
    identities.add(asset.id);
    const parts = asset.path.split("/");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(asset.id) || isAbsolute(asset.path) ||
      /[\\:%?#\x00-\x1f\x7f]/u.test(asset.path) || parts.some(part => !part || part === "." || part === "..")) {
      throw new Error("UNSAFE_CATALOG_MEDIA_PATH");
    }
    let file = root;
    for (const part of parts) {
      file = join(file, part);
      if (lstatSync(file).isSymbolicLink()) throw new Error("CATALOG_MEDIA_SYMLINK");
    }
    const mediaType = catalogMediaTypes[extname(file).toLowerCase()];
    if (!mediaType || !lstatSync(file).isFile()) throw new Error("UNSUPPORTED_CATALOG_MEDIA");
    const bytes = readFileSync(file);
    return Object.freeze({ id: asset.id, file, digest: hash(bytes), size: bytes.length, mediaType });
  }));
}
