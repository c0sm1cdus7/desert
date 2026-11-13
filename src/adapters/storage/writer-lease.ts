// SQLite alone owns the sidecar's descriptors; filesystem identity checks never open it.
import { rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { journalTexts } from "../../texts/journal.texts.ts";
import { privateDatabase } from "./home.ts";
export class WriterLeaseLost extends Error {
  readonly code = "WRITER_LEASE_LOST";
  constructor() {
    super(journalTexts.leaseLost);
    this.name = "WriterLeaseLost";
  }
}
export function writerLease(file: string) {
  if (file === ":memory:") return { check: () => {}, release: () => {} };
  const sidecar = `${file}.writer.sqlite`;
  const before = statSync(sidecar, { throwIfNoEntry: false, bigint: true });
  const db = privateDatabase(sidecar);
  let lost = false;
  let owned = before;
  const check = () => {
    try {
      const current = statSync(sidecar, { throwIfNoEntry: false, bigint: true });
      lost ||= !db.isOpen || !owned || current?.dev !== owned.dev || current.ino !== owned.ino;
    } catch {
      lost = true;
    }
    if (lost) throw new WriterLeaseLost();
  };
  try {
    owned ??= statSync(sidecar, { throwIfNoEntry: false, bigint: true });
    db.exec(journalTexts.writerLeaseSql);
    check();
    // An obsolete bridge is ignored; only an acquired owner cleans it, never on close.
    rmSync(join(dirname(file), "journal.lock"), { force: true });
  } catch (error) {
    db.close();
    if (error instanceof Error && "errcode" in error && [5, 6].includes(Number(error.errcode)))
      throw new Error(journalTexts.locked);
    throw error;
  }
  return {
    check,
    release: () => {
      if (db.isOpen) db.close();
    },
  };
}
