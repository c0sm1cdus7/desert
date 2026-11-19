// SQLite copies a consistent journal including its WAL; no foreign descriptor can release a live reader's lock.
import { chmodSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { privateFileMode } from "../../storage/home.ts";
import { storageIdentity } from "../../storage/storage-identity.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
export function copyJournal(source: string, target: string): void {
  const db = new DatabaseSync(storageIdentity(source), { readOnly: true });
  try {
    db.prepare(journalTexts.copyJournal).run(target);
    chmodSync(target, privateFileMode);
  } finally {
    db.close();
  }
}
