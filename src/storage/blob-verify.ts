// Law: a blob is named by the sha256 of its bytes; every byte that enters or leaves a store is counted and hashed.
// Raises INVALID_BLOB_DIGEST, INVALID_BLOB_SIZE, INVALID_BLOB_BYTES and the caller's mismatch codes.
import { createHash } from "node:crypto";

export type BlobSource = Iterable<Uint8Array> | AsyncIterable<Uint8Array>;
export type MismatchCodes = Readonly<{ size: string; digest: string }>;
export const putMismatch: MismatchCodes = Object.freeze({ size: "BLOB_SIZE_MISMATCH", digest: "BLOB_DIGEST_MISMATCH" });
export const readMismatch: MismatchCodes = Object.freeze({ size: "BLOB_INTEGRITY_FAILED", digest: "BLOB_INTEGRITY_FAILED" });

export function requireBlobDigest(digest: string) {
  if (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)) throw new Error("INVALID_BLOB_DIGEST: a blob is named by lower-case sha256 hex");
}
export function requireBlobSize(size: number) {
  if (!Number.isSafeInteger(size) || size < 0) throw new Error("INVALID_BLOB_SIZE: a blob size is a non-negative safe integer");
}

/**
 * Re-yields `source` while counting and hashing it. The last chunk is held back until the count and the digest are
 * proven, so a consumer never receives a complete copy of bytes that do not match their name.
 */
export async function* verifiedChunks(source: BlobSource, digest: string, size: number, codes: MismatchCodes): AsyncGenerator<Uint8Array> {
  const hash = createHash("sha256");
  let received = 0;
  let held: Uint8Array | undefined;
  for await (const chunk of source) {
    if (!(chunk instanceof Uint8Array)) throw new Error("INVALID_BLOB_BYTES: a blob source yields Uint8Array chunks");
    received += chunk.byteLength;
    if (received > size) throw new Error(`${codes.size}: more than the declared ${size} bytes`);
    hash.update(chunk);
    if (held) yield held;
    held = chunk;
  }
  if (received !== size) throw new Error(`${codes.size}: ${received} bytes, declared ${size}`);
  if (hash.digest("hex") !== digest) throw new Error(`${codes.digest}: the bytes do not hash to ${digest}`);
  if (held) yield held;
}
