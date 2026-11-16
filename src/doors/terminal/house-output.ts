// The detached server's stdout and stderr stay in its private home, never in the launcher's terminal.
export const houseOutputBytes = 1024 * 1024;
import { constants, openSync, closeSync, mkdirSync, lstatSync, fstatSync, fchmodSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { privateDirectoryMode, privateFileMode } from "../../storage/home.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
export function houseOutput(home: string): number {
  mkdirSync(home, { recursive: true, mode: privateDirectoryMode });
  if (!lstatSync(home).isDirectory() || lstatSync(home).isSymbolicLink()) throw new Error(socketTexts.startFailed);
  chmodSync(home, privateDirectoryMode);
  const fd = openSync(
    join(home, "casa.log"),
    constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW,
    privateFileMode,
  );
  try {
    const file = fstatSync(fd);
    if (!file.isFile() || file.nlink !== 1) throw new Error(socketTexts.startFailed);
    fchmodSync(fd, privateFileMode);
    return fd;
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}
