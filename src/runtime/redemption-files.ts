// Bind private redemption I/O to checked descriptors and retain the containing directory's identity.
import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  lstatSync,
  readSync,
  writeSync,
  ftruncateSync,
  fsyncSync,
} from "node:fs";
import { isRecord } from "../fields/json-values.ts";
export const configurationLimit = 1_048_576;
export const recoveryLimit = 44;
export const createPrivate = constants.O_RDWR | constants.O_CREAT | constants.O_EXCL;

export function checkPrivate(fd: number, limit: number) {
  const stat = fstatSync(fd);
  if (
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.uid !== process.geteuid?.() ||
    (stat.mode & 0o7777) !== 0o600 ||
    stat.size > limit
  )
    throw new Error("private-file");
  return stat;
}
export function openPrivate(file: string, flags: number, limit: number) {
  const fd = openSync(file, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  try {
    checkPrivate(fd, limit);
    return fd;
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}
export function optionalPrivate(file: string, limit: number) {
  try {
    return openPrivate(file, constants.O_RDONLY, limit);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}
export function readPrivate(fd: number, limit: number) {
  checkPrivate(fd, limit);
  const bytes = Buffer.alloc(limit + 1);
  let length = 0;
  try {
    for (;;) {
      const count = readSync(fd, bytes, length, bytes.length - length, length);
      if (!count) break;
      length += count;
      if (length > limit) throw new Error("private-size");
    }
    checkPrivate(fd, limit);
    return bytes.toString("utf8", 0, length);
  } finally {
    bytes.fill(0);
  }
}
export function writePrivate(fd: number, content: string, limit: number) {
  checkPrivate(fd, limit);
  const bytes = Buffer.from(content);
  try {
    if (bytes.length > limit) throw new Error("private-size");
    let offset = 0;
    while (offset < bytes.length) {
      const count = writeSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!count) throw new Error("private-write");
      offset += count;
    }
    ftruncateSync(fd, bytes.length);
    fsyncSync(fd);
    checkPrivate(fd, limit);
  } finally {
    bytes.fill(0);
  }
}
export function checkName(fd: number, file: string) {
  const opened = fstatSync(fd),
    named = lstatSync(file);
  if (named.isSymbolicLink() || named.dev !== opened.dev || named.ino !== opened.ino) throw new Error("replaced-file");
}
export function privateDirectory(path: string) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  const check = () => {
    const stat = fstatSync(fd);
    if (!stat.isDirectory() || stat.uid !== process.geteuid?.() || (stat.mode & 0o022) !== 0)
      throw new Error("private-directory");
    checkName(fd, path);
  };
  try {
    check();
    return { check, close: () => closeSync(fd) };
  } catch (error) {
    closeSync(fd);
    throw error;
  }
}
