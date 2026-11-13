// SQLite alone owns the sidecar's descriptors; filesystem identity checks never open it.
import { accessSync, constants, lstatSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { journalTexts } from "../../texts/journal.texts.ts";
import { sqliteFiles } from "./sqlite-files.ts";
import { DatabaseSync } from "node:sqlite";
export class WriterLeaseLost extends Error {
  readonly code = "WRITER_LEASE_LOST";
  constructor() {
    super(journalTexts.leaseLost);
    this.name = "WriterLeaseLost";
  }
}
export class WriterLeaseUnavailable extends Error {
  readonly code = "WRITER_LEASE_UNAVAILABLE";
  constructor(cause: unknown) {
    super(journalTexts.leaseUnavailable, { cause });
    this.name = "WriterLeaseUnavailable";
  }
}
function openSidecar(sidecar: string) {
  let db: DatabaseSync;
  let before;
  try {
    accessSync(dirname(sidecar), constants.W_OK);
    before = sqliteFiles(sidecar);
    if (before) accessSync(sidecar, constants.W_OK);
    db = new DatabaseSync(sidecar);
    return { db, before };
  } catch (error) {
    throw new WriterLeaseUnavailable(error);
  }
}
const release = (db: DatabaseSync): void => {
  if (db.isOpen) db.close();
};
export function writerLease(file: string) {
  if (file === ":memory:") return { check: () => {}, release: () => {} };
  const sidecar = `${file}.writer.sqlite`;
  const { db, before } = openSidecar(sidecar);
  let lost = false;
  let owned = before;
  const check = () => {
    try {
      const current = lstatSync(sidecar, { throwIfNoEntry: false, bigint: true });
      lost ||=
        !db.isOpen ||
        !owned ||
        !current?.isFile() ||
        current.nlink !== 1n ||
        current.dev !== owned.dev ||
        current.ino !== owned.ino ||
        current.birthtimeNs !== owned.birthtimeNs;
    } catch {
      lost = true;
    }
    if (lost) throw new WriterLeaseLost();
  };
  try {
    owned ??= lstatSync(sidecar, { throwIfNoEntry: false, bigint: true });
    db.exec(journalTexts.writerLeaseSql);
    check();
    // An obsolete bridge is ignored; only an acquired owner cleans it, never on close.
    rmSync(join(dirname(file), "journal.lock"), { force: true });
  } catch (error) {
    db.close();
    if (error instanceof Error && "errcode" in error && [5, 6].includes(Number(error.errcode)))
      throw new Error(journalTexts.locked);
    if (error instanceof WriterLeaseLost) throw error;
    throw new WriterLeaseUnavailable(error);
  }
  return {
    check,
    release: () => release(db),
  };
}
