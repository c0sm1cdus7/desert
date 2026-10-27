// Law: the disk adapter keeps the private-files hygiene of src/assets/storage.ts: a 0700 directory owned by this
// user, 0600 files opened with O_EXCL | O_NOFOLLOW, fsync of every file and of the directory after each change.
// Raises BLOB_NOT_FOUND, PRIVATE_ASSET_DIRECTORY_REQUIRED, PRIVATE_ASSET_FILE_REQUIRED, BLOB_CLEANUP_FAILED.
import { constants, type Stats } from "node:fs";
import { open, rename, unlink, type FileHandle } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { createPrivateDirectory, openPrivateFile, requirePrivateDirectory, syncDirectory } from "../assets/private-files.ts";
import type { BlobStore } from "./blob.ts";
import { putMismatch, readMismatch, requireBlobDigest, requireBlobSize, verifiedChunks, type BlobSource } from "./blob-verify.ts";

const readSize = 64 * 1024;
const errorCode = (error: unknown) => error instanceof Error && "code" in error ? error.code : undefined;

async function openBlobFile(file: string): Promise<FileHandle> {
  try { return await openPrivateFile(file); } catch (error) {
    if (errorCode(error) === "ENOENT") throw new Error("BLOB_NOT_FOUND: no blob with this digest", { cause: error });
    if (errorCode(error) === "ELOOP") throw new Error("PRIVATE_ASSET_FILE_REQUIRED: the blob path is a symbolic link", { cause: error });
    throw error;
  }
}

/** Reopens the file the read was granted for and refuses a different inode in its place. */
async function* fileChunks(file: string, granted: Stats): AsyncGenerator<Uint8Array> {
  const handle = await openBlobFile(file);
  try {
    const current = await handle.stat();
    if (current.ino !== granted.ino || current.dev !== granted.dev) throw new Error("BLOB_INTEGRITY_FAILED: the blob file was replaced");
    for (;;) {
      const { bytesRead, buffer } = await handle.read(Buffer.alloc(readSize), 0, readSize, null);
      if (bytesRead === 0) return;
      yield buffer.subarray(0, bytesRead);
    }
  } finally { await handle.close(); }
}

async function writeVerified(folder: string, digest: string, source: BlobSource, size: number) {
  const temporary = join(folder, `.incoming-${randomUUID()}`);
  const handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    try {
      for await (const chunk of verifiedChunks(source, digest, size, putMismatch)) await handle.writeFile(chunk);
      await handle.sync();
    } finally { await handle.close(); }
    await rename(temporary, join(folder, digest));
    await syncDirectory(folder);
  } catch (error) {
    await unlink(temporary).catch(cleanup => {
      if (errorCode(cleanup) !== "ENOENT") throw new AggregateError([error, cleanup], "BLOB_CLEANUP_FAILED: a rejected upload could not be removed");
    });
    throw error;
  }
}

export async function openDiskBlobStore(directory: string): Promise<BlobStore> {
  const root = await createPrivateDirectory(directory);
  return Object.freeze({
    async put(digest: string, source: BlobSource, size: number) {
      requireBlobDigest(digest); requireBlobSize(size);
      await writeVerified(await requirePrivateDirectory(root), digest, source, size);
      return Object.freeze({ size });
    },
    async get(digest: string) {
      requireBlobDigest(digest);
      const file = join(await requirePrivateDirectory(root), digest);
      const handle = await openBlobFile(file);
      let granted: Stats;
      try { granted = await handle.stat(); } finally { await handle.close(); }
      return Object.freeze({ size: granted.size, chunks: verifiedChunks(fileChunks(file, granted), digest, granted.size, readMismatch) });
    },
    async stat(digest: string) {
      requireBlobDigest(digest);
      const handle = await openBlobFile(join(await requirePrivateDirectory(root), digest)).catch(error => {
        if (error instanceof Error && error.message.startsWith("BLOB_NOT_FOUND:")) return undefined;
        throw error;
      });
      if (!handle) return undefined;
      try { return Object.freeze({ size: (await handle.stat()).size }); } finally { await handle.close(); }
    },
    async delete(digest: string) {
      requireBlobDigest(digest);
      const folder = await requirePrivateDirectory(root);
      await unlink(join(folder, digest)).catch(error => { if (errorCode(error) !== "ENOENT") throw error; });
      await syncDirectory(folder);
    },
  });
}
