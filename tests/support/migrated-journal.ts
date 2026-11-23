// A journal from before 23/11 opens only once migrated: its identities get the Spanish they have read it in.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrateStoredNames } from "../../src/runtime/stored-names.ts";
export function migratedJournal(home: string, file = "journal.sqlite") {
  const backups = mkdtempSync(join(tmpdir(), "desert-migration-"));
  try {
    return migrateStoredNames(join(home, file), "house", backups);
  } finally {
    rmSync(backups, { recursive: true, force: true });
  }
}
