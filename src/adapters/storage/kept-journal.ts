import { journalTexts } from "../../texts/journal.texts.ts";
// Inspect only a disposable kept journal; its original is never opened for writing.
import { previousFolds } from "./previous-folds.ts";
import { DatabaseSync } from "node:sqlite";
import { storageIdentity } from "./storage-identity.ts";
import { writerLease } from "./writer-lease.ts";
import { journalIdentity } from "./journal-identity.ts";
import { privateDatabase } from "./home.ts";
/** A kept journal supplies its boot identity and last instant; discard its cache to fold every fact again. */
export function journalKept(
  file: string,
  discard = true,
): Readonly<{ runner: string; last: number; previous: boolean }> {
  const canonical = storageIdentity(file);
  const lease = writerLease(canonical);
  let db: DatabaseSync | undefined;
  try {
    lease.check();
    db = privateDatabase(canonical);
    journalIdentity(db, lease.check);
    const boot = db.prepare(journalTexts.keptBootSql).get();
    const last = db.prepare(journalTexts.lastInstantSql).get();
    if (typeof last?.at !== "number") throw new Error("A kept journal has no dated fact");
    const runner = String(boot?.by ?? "");
    const previous = previousFolds(db, runner);
    if (discard) {
      lease.check();
      db.exec(journalTexts.discardFoldsSql);
    }
    return { runner, last: last.at, previous };
  } finally {
    try {
      db?.close();
    } finally {
      lease.release();
    }
  }
}
