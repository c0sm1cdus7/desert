import { constants } from "node:fs";
import { lstat, mkdir, open, realpath } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

export async function requirePrivateDirectory(directory: string) {
  if (!isAbsolute(directory)) throw new Error("PRIVATE_ASSET_DIRECTORY_REQUIRED");
  const entry = await lstat(directory);
  if (!entry.isDirectory() || entry.isSymbolicLink() || entry.uid !== process.getuid?.() || (entry.mode & 0o077)) {
    throw new Error("PRIVATE_ASSET_DIRECTORY_REQUIRED");
  }
  return realpath(directory);
}
export async function createPrivateDirectory(directory: string) {
  let created = false;
  await mkdir(directory, { mode: 0o700 }).then(() => { created = true; })
    .catch(error => { if (error.code !== "EEXIST") throw error; });
  if (created) await syncDirectory(dirname(directory));
  return requirePrivateDirectory(directory);
}
export async function syncDirectory(directory: string) {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await handle.sync(); } finally { await handle.close(); }
}
export async function openPrivateFile(file: string) {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const entry = await handle.stat();
    if (!entry.isFile() || entry.uid !== process.getuid?.() || (entry.mode & 0o077) || entry.nlink !== 1) {
      throw new Error("PRIVATE_ASSET_FILE_REQUIRED");
    }
    return handle;
  } catch (error) { await handle.close(); throw error; }
}
