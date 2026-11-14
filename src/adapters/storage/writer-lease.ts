// SQLite alone owns the sidecar's descriptors; filesystem identity checks never open it.
import { accessSync, constants, lstatSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { journalTexts } from "../../texts/journal.texts.ts";
import { sqliteFiles } from "./sqlite-files.ts";
import { DatabaseSync } from "node:sqlite";
export class WriterAlreadyOpen extends Error {
  readonly code = "WRITER_ALREADY_OPEN";
  constructor() {
    super(journalTexts.locked);
    this.name = "WriterAlreadyOpen";
  }
}
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
function createSidecar(sidecar: string): DatabaseSync {
  const folder = mkdtempSync(join(tmpdir(), "desert-writer-mode-"));
  try {
    const mode = join(folder, "mode");
    writeFileSync(mode, "", { mode: 0o600, flag: "wx" });
    const uri = pathToFileURL(sidecar);
    uri.searchParams.set("modeof", mode);
    return new DatabaseSync(uri);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
function openSidecar(sidecar: string) {
  let db: DatabaseSync;
  let before;
  try {
    accessSync(dirname(sidecar), constants.W_OK);
    before = sqliteFiles(sidecar);
    db = before ? new DatabaseSync(sidecar) : createSidecar(sidecar);
    return { db, before };
  } catch (error) {
    throw new WriterLeaseUnavailable(error);
  }
}
const release = (db: DatabaseSync): void => {
  if (db.isOpen) db.close();
};
function leaseGuard(db: DatabaseSync, sidecar: string, owned: ReturnType<typeof sqliteFiles>) {
  let lost = false;
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
  return {
    check,
    lose: () => {
      lost = true;
      throw new WriterLeaseLost();
    },
  };
}
export function writerLease(file: string) {
  if (file === ":memory:")
    return {
      check: () => {},
      release: () => {},
      lose: () => {
        throw new WriterLeaseLost();
      },
    };
  const sidecar = `${file}.writer.sqlite`;
  const { db, before } = openSidecar(sidecar);
  let guard: ReturnType<typeof leaseGuard>;
  try {
    guard = leaseGuard(db, sidecar, before ?? lstatSync(sidecar, { throwIfNoEntry: false, bigint: true }));
    db.exec(journalTexts.writerLeaseSql);
    guard.check();
    // An obsolete bridge is ignored; only an acquired owner cleans it, never on close.
    rmSync(join(dirname(file), "journal.lock"), { force: true });
  } catch (error) {
    db.close();
    if (error instanceof Error && "errcode" in error && [5, 6].includes(Number(error.errcode)))
      throw new WriterAlreadyOpen();
    if (error instanceof WriterLeaseLost) throw error;
    throw new WriterLeaseUnavailable(error);
  }
  return { ...guard, release: () => release(db) };
}
