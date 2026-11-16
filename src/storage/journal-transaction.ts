// Each nested write owns a SQLite savepoint; releasing it still leaves it under its outer transaction.
import type { DatabaseSync } from "node:sqlite";
import { journalTexts } from "../texts/journal.texts.ts";
export function journalTransaction(db: DatabaseSync, position: { begin(): void }, nested: boolean) {
  if (nested) db.exec(journalTexts.savepointWrite);
  else position.begin();
  return {
    commit: () => db.exec(nested ? journalTexts.releaseWrite : "commit"),
    rollback: () => {
      if (nested) db.exec(journalTexts.rollbackWrite);
      else db.exec("rollback");
    },
  };
}
