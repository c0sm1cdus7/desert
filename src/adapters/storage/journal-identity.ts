// A journal receives its permanent identity on first opening, including journals from older releases.
import { journalTexts } from "../../texts/journal.texts.ts";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
export function journalIdentity(db: DatabaseSync, check: () => void): string {
  check();
  db.exec(journalTexts.identityTable);
  check();
  db.prepare(journalTexts.identityInsert).run(randomUUID());
  const identity = db.prepare(journalTexts.identityRead).get()?.id;
  if (typeof identity !== "string" || !identity) throw new Error("Invalid journal identity");
  return identity;
}
