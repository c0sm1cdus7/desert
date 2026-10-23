import { constants } from "node:fs";
import { lstat, open, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { openPrivateFile, syncDirectory } from "./private-files.ts";
import { privateAssetStoreDirectory, type PrivateAssetStore } from "./storage.ts";
import { requireAssetReference } from "./types.ts";

async function bindInstallation(directory: string, installation: string) {
  requireAssetReference(installation);
  const path = join(directory, ".installation");
  try {
    const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { await file.writeFile(installation); await file.sync(); } finally { await file.close(); }
    await syncDirectory(directory);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  const file = await openPrivateFile(path);
  try {
    if ((await file.stat()).size !== installation.length || await file.readFile("utf8") !== installation) {
      throw new Error("ASSET_INSTALLATION_MISMATCH");
    }
  } finally { await file.close(); }
}

export async function claimPrivateAssetStore(store: PrivateAssetStore, installation: string) {
  const directory = privateAssetStoreDirectory(store), path = join(directory, ".host");
  const file = await open(path, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    .catch(error => { if (error.code === "EEXIST") throw new Error("ASSET_STORE_IN_USE"); throw error; });
  const identity = await file.stat();
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    try {
      const current = await lstat(path);
      if (current.ino !== identity.ino || current.dev !== identity.dev || !current.isFile()) throw new Error("ASSET_HOST_LOCK_CHANGED");
      await unlink(path); await syncDirectory(directory);
    } finally { await file.close(); }
  }
  try {
    await file.writeFile(JSON.stringify({ lease: randomUUID(), process: process.pid }));
    await file.sync(); await syncDirectory(directory);
    await bindInstallation(directory, installation);
    return Object.freeze({ close });
  } catch (error) { await close(); throw error; }
}
