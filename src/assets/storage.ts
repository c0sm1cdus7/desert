import { constants } from "node:fs";
import { access, mkdir, open, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { createPrivateDirectory, openPrivateFile, requirePrivateDirectory, syncDirectory } from "./private-files.ts";
import { fileLimits, assetReservationBytes } from "./policy.ts";
import { requireAssetReference, type AssetFile, type AssetImageVariant } from "./types.ts";
import { renditionWidths } from "../media/rendition-policy.ts";

export type AssetVariant = AssetImageVariant;
const privateStores = new WeakMap<object, string>();
export function privateAssetStoreDirectory(store: object) {
  const directory = privateStores.get(store);
  if (!directory) throw new Error("PRIVATE_ASSET_STORE_REQUIRED");
  return directory;
}
const fileName = (variant: AssetVariant) => {
  if (variant === "original") return variant;
  if (!renditionWidths.includes(variant)) throw new Error("INVALID_ASSET_VARIANT");
  return `preview-${variant}.webp`;
};
export async function openPrivateAssetStore(directory: string) {
  const root = await createPrivateDirectory(directory), marker = join(root, ".store");
  try { await access(marker); } catch {
    if ((await readdir(root)).length) throw new Error("UNRECOGNIZED_ASSET_STORE");
    const handle = await open(marker, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { await handle.writeFile(randomUUID()); await handle.sync(); } finally { await handle.close(); }
    await syncDirectory(root);
  }
  const markerHandle = await openPrivateFile(marker);
  let id: string;
  try { id = await markerHandle.readFile("utf8"); } finally { await markerHandle.close(); }
  requireAssetReference(id);
  async function assetDirectory(reference: string) {
    requireAssetReference(reference); await requirePrivateDirectory(root);
    return requirePrivateDirectory(join(root, reference));
  }
  async function write(reference: string, variant: AssetVariant, chunks: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, size: number) {
    const folder = await assetDirectory(reference), name = fileName(variant), file = join(folder, name);
    if (!Number.isSafeInteger(size) || size <= 0 || size > (variant === "original" ? fileLimits.maxBytes : fileLimits.renditionBytes)) {
      throw new Error("ASSET_SIZE_LIMIT");
    }
    const handle = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
      .catch(error => { if (error.code === "EEXIST") throw new Error("ASSET_FILE_EXISTS"); throw error; });
    const hash = createHash("sha256"); let received = 0;
    try {
      for await (const chunk of chunks) {
        if (!(chunk instanceof Uint8Array)) throw new Error("INVALID_ASSET_BYTES");
        received += chunk.byteLength;
        if (received > size) throw new Error("ASSET_SIZE_MISMATCH");
        await handle.writeFile(chunk); hash.update(chunk);
      }
      if (received !== size) throw new Error("ASSET_SIZE_MISMATCH");
      await handle.sync();
    } finally { await handle.close(); }
    await syncDirectory(folder);
    return Object.freeze({ size, digest: hash.digest("hex") });
  }
  const store = Object.freeze({
    id,
    async allocate(reference: string) {
      requireAssetReference(reference); await requirePrivateDirectory(root);
      await mkdir(join(root, reference), { mode: 0o700 }); await syncDirectory(root);
    },
    writeOriginal(reference: string, chunks: Iterable<Uint8Array> | AsyncIterable<Uint8Array>, size: number) {
      assetReservationBytes(size); return write(reference, "original", chunks, size);
    },
    writeRendition(reference: string, edge: AssetVariant & number, bytes: Uint8Array) {
      return write(reference, edge, [bytes], bytes.byteLength);
    },
    async read(reference: string, variant: AssetVariant, expected: AssetFile) {
      const file = join(await assetDirectory(reference), fileName(variant));
      const handle = await openPrivateFile(file);
      try {
        const stat = await handle.stat();
        if (!Number.isSafeInteger(expected.size) || expected.size <= 0 || expected.size > fileLimits.renditionBytes ||
          stat.size !== expected.size || !/^[0-9a-f]{64}$/.test(expected.digest)) throw new Error("ASSET_INTEGRITY_FAILED");
        const bytes = await handle.readFile();
        if (createHash("sha256").update(bytes).digest("hex") !== expected.digest) throw new Error("ASSET_INTEGRITY_FAILED");
        return bytes;
      } finally { await handle.close(); }
    },
  });
  privateStores.set(store, root);
  return store;
}
export type PrivateAssetStore = Awaited<ReturnType<typeof openPrivateAssetStore>>;
