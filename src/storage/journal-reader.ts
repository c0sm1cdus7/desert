import { DatabaseSync } from "node:sqlite";
import { storageIdentity } from "./storage-identity.ts";
import { factOf } from "./journal-record.ts";
import type { Event, Foreign, Vocabulary } from "../journal/facts.ts";
/** A journal another process may be writing, read without its lock: the events after a sequence, oldest first. */
export function journalReader<P extends Foreign>(file: string, words: Vocabulary<P>) {
  const db = new DatabaseSync(storageIdentity(file), { readOnly: true });
  try {
    const after = db.prepare("select * from events where seq > ? order by seq");
    return {
      since: (seq: number): Event<P>[] => after.all(seq).map(row => words.read(factOf(row))),
      close: () => db.close(),
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
