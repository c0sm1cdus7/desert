// SQLite's journal, WAL and SHM siblings must never alias another database's locked inode.
import { lstatSync } from "node:fs";
import { journalTexts } from "../../texts/journal.texts.ts";
export function sqliteFiles(file: string) {
  if (file === ":memory:") return undefined;
  const entries = ["", "-journal", "-wal", "-shm"].map(suffix => {
    const entry = lstatSync(`${file}${suffix}`, { throwIfNoEntry: false, bigint: true });
    if (entry?.nlink === 0n) return undefined;
    if (entry && (!entry.isFile() || entry.nlink !== 1n)) throw new Error(journalTexts.invalidSqliteFiles);
    return entry;
  });
  return entries[0];
}
