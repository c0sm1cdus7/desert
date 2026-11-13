// SQLite owns exclusion; a PID in the legacy bridge never grants or releases ownership.
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { privateFileMode } from "../../catalogs/levers.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { privateDatabase } from "./home.ts";
export function writerLease(file: string): () => void {
  if (file === ":memory:") return () => {};
  const db = privateDatabase(`${file}.writer.sqlite`);
  try {
    db.exec(journalTexts.writerLeaseSql);
  } catch (error) {
    db.close();
    if (error instanceof Error && "errcode" in error && [5, 6].includes(Number(error.errcode)))
      throw new Error(journalTexts.locked);
    throw error;
  }
  const lock = join(dirname(file), "journal.lock");
  try {
    writeFileSync(lock, String(process.pid), { mode: privateFileMode });
  } catch (error) {
    db.close();
    throw error;
  }
  return () => {
    if (!db.isOpen) return;
    try {
      rmSync(lock, { force: true });
    } finally {
      // Never unlink the sidecar: another connection must lock this same file after us.
      db.close();
    }
  };
}
