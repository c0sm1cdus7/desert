// Keeps opening diagnostics outside the journal and the terminal's output.
import { closeSync, constants, fstatSync, openSync, readSync, writeSync } from "node:fs";
import { join } from "node:path";
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { journalTexts } from "../texts/journal.texts.ts";
/** The file operations the record uses; a test gives others to make each one fail. */
export interface RecordFiles {
  openSync(path: string, flags: number, mode: number): number;
  fstatSync(fd: number): { isFile(): boolean; nlink: number; uid: number; size: number };
  readSync(fd: number, into: Buffer, offset: number, length: number, position: number): number;
  writeSync(fd: number, bytes: Buffer, offset: number, length: number): number;
  closeSync(fd: number): void;
}
export const recordFiles: RecordFiles = {
  openSync: (path, how, mode) => openSync(path, how, mode),
  fstatSync: fd => fstatSync(fd),
  readSync: (fd, into, offset, length, position) => readSync(fd, into, offset, length, position),
  writeSync: (fd, bytes, offset, length) => writeSync(fd, bytes, offset, length),
  closeSync: fd => closeSync(fd),
};
/** Opened without following a link and without waiting on a pipe; written only if it is a regular file of its own. */
const flags = constants.O_RDWR | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK;
/** Why a line could not go to the record: the system's code, or what this house refuses. */
const causeOf = (error: unknown): string =>
  error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : String(error);
/** Writes every byte or says why not; a write that moves nothing stops instead of looping. */
function writeAll(files: RecordFiles, fd: number, bytes: Buffer): string | undefined {
  for (let done = 0; done < bytes.length;) {
    const wrote = files.writeSync(fd, bytes, done, bytes.length - done);
    if (wrote <= 0) return journalTexts.incompleteRecord;
    done += wrote;
  }
  return undefined;
}
/** A line after a cut one starts on its own line, so an earlier fragment never swallows it. */
function delimited(files: RecordFiles, fd: number, size: number, line: string): Buffer {
  const last = Buffer.alloc(1);
  const cut = size > 0 && files.readSync(fd, last, 0, 1, size - 1) === 1 && last[0] !== 0x0a;
  return Buffer.from(cut ? `\n${line}` : line, "utf8");
}
/** Appends one line to the house's record of openings. It never throws: what failed is returned, the first cause. */
function append(files: RecordFiles, path: string, line: string): string | undefined {
  let fd: number | undefined;
  let cause: string | undefined;
  try {
    fd = files.openSync(path, flags, 0o600);
    const stat = files.fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid?.()) cause = journalTexts.notOwnRecord;
    else cause = writeAll(files, fd, delimited(files, fd, stat.size, line));
  } catch (error) {
    cause = causeOf(error);
  } finally {
    if (fd !== undefined)
      try {
        files.closeSync(fd);
      } catch (error) {
        cause ??= causeOf(error);
      }
  }
  return cause;
}
export function storageNotices(home?: string, files: RecordFiles = recordFiles) {
  const warnings: FoldWarning[] = [];
  const unsaved = new Set<string>();
  return {
    warn: (warning: FoldWarning) => {
      warnings.push(Object.freeze({ ...warning }));
      if (!home) return;
      const line = `${JSON.stringify({ code: journalTexts.rebuildCode, ...warning })}\n`;
      const cause = append(files, join(home, "storage-notices.jsonl"), line);
      if (cause !== undefined) unsaved.add(cause);
    },
    read: (): readonly FoldWarning[] => [...warnings],
    /** Why the record of this opening could not be kept, once per cause. */
    unsaved: (): readonly string[] => [...unsaved],
  };
}
