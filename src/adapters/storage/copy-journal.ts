// SQLite copies a consistent journal including its WAL; no foreign descriptor can release a live reader's lock.
import { DatabaseSync } from "node:sqlite";
import { journalTexts } from "../../texts/journal.texts.ts";
import { storageIdentity } from "./storage-identity.ts";
import { chmodSync } from "node:fs";
import { privateFileMode } from "../../catalogs/levers.ts";
export function copyJournal(source: string, target: string): void {
  const db = new DatabaseSync(storageIdentity(source), { readOnly: true });
  try {
    db.prepare(journalTexts.copyJournal).run(target);
    chmodSync(target, privateFileMode);
  } finally {
    db.close();
  }
}
