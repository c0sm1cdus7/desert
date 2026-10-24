// Law: file bytes live behind one content-addressed interface (sha256). The Environment binds the adapter and the
// host provides its keychain; a product never names an adapter, a bucket or a key. Raises INVALID_BLOB_BINDING.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { openBucketBlobStore } from "./blob-bucket.ts";
import { openDiskBlobStore } from "./blob-disk.ts";
import type { BlobSource } from "./blob-verify.ts";

export type { BlobSource } from "./blob-verify.ts";
export type BlobStat = Readonly<{ size: number }>;
export type BlobRead = Readonly<{
  size: number;
  /** Fails BLOB_INTEGRITY_FAILED before its last chunk when the stored bytes no longer hash to the digest. */
  chunks: AsyncIterable<Uint8Array>;
}>;
export type BlobStore = Readonly<{
  /** Stores `size` bytes named by their sha256; refuses bytes that do not match the name. Idempotent. */
  put(digest: string, source: BlobSource, size: number): Promise<BlobStat>;
  /** Fails BLOB_NOT_FOUND for an unknown digest. */
  get(digest: string): Promise<BlobRead>;
  stat(digest: string): Promise<BlobStat | undefined>;
  /** Idempotent: deleting an absent blob succeeds. */
  delete(digest: string): Promise<void>;
}>;
/** The host's secret store; entries are named, the values never leave the host process. */
export type HostKeychain = Readonly<{ secret(entry: string): Promise<string> }>;
export type BlobHost = Readonly<{ keychain: HostKeychain }>;

const closed = { additionalProperties: false } as const;
const keychainEntry = Type.String({ pattern: "^[a-z0-9][a-z0-9._-]{0,127}$" });
export const DiskBindingSchema = Type.Object({
  adapter: Type.Literal("disk"),
  directory: Type.String({ pattern: "^/" }),
}, closed);
export const BucketBindingSchema = Type.Object({
  adapter: Type.Literal("bucket"),
  endpoint: Type.String({ pattern: "^https?://[^/?#@]+/?$" }),
  region: Type.String({ pattern: "^[a-z0-9-]{1,32}$" }),
  bucket: Type.String({ pattern: "^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$" }),
  credentials: Type.Object({ accessKeyId: keychainEntry, secretAccessKey: keychainEntry }, closed),
}, closed);
export const BlobBindingSchema = Type.Union([DiskBindingSchema, BucketBindingSchema]);
export type BucketBinding = Static<typeof BucketBindingSchema>;
export type BlobBinding = Static<typeof BlobBindingSchema>;

const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
const invalid = (what: string): never => { throw new Error(`INVALID_BLOB_BINDING: ${what}; contract: src/storage/blob.ts`); };

/** Opens the store the Environment bound. `binding` is the Environment's data, validated here. */
export async function openBlobStore(binding: unknown, host: BlobHost): Promise<BlobStore> {
  if (!Value.Check(BlobBindingSchema, binding)) return invalid("the binding is not a disk or bucket binding");
  if (binding.adapter === "disk") return openDiskBlobStore(binding.directory);
  const endpoint = new URL(binding.endpoint);
  if (endpoint.protocol === "http:" && !loopback.has(endpoint.hostname)) invalid("plain http is accepted only on a loopback host");
  return openBucketBlobStore(binding, host.keychain);
}
