// Conserva diagnósticos de apertura fuera del diario y de la salida de la terminal.
import { closeSync, constants, fstatSync, openSync, writeSync } from "node:fs";
import { join } from "node:path";
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { journalTexts } from "../texts/journal.texts.ts";
/** Opened without following a link and without waiting on a pipe; written only if it is a regular file of its own. */
const flags = constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK;
/** Why a line could not go to the record: the system's code, or that the name is not a file of this house. */
const causeOf = (error: unknown): string =>
  error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : String(error);
/** Appends one line to the house's record of openings. It never stops an opening: what failed is returned. */
function append(path: string, line: string): string | undefined {
  let fd: number | undefined;
  try {
    fd = openSync(path, flags, 0o600);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid?.()) return journalTexts.notOwnRecord;
    writeSync(fd, line);
    return undefined;
  } catch (error) {
    return causeOf(error);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
export function storageNotices(home?: string) {
  const warnings: FoldWarning[] = [];
  const unsaved = new Set<string>();
  return {
    warn: (warning: FoldWarning) => {
      warnings.push(Object.freeze({ ...warning }));
      if (!home) return;
      const line = `${JSON.stringify({ code: journalTexts.rebuildCode, ...warning })}\n`;
      const cause = append(join(home, "storage-notices.jsonl"), line);
      if (cause !== undefined) unsaved.add(cause);
    },
    read: (): readonly FoldWarning[] => [...warnings],
    /** Why the record of this opening could not be kept, once per cause. */
    unsaved: (): readonly string[] => [...unsaved],
  };
}
