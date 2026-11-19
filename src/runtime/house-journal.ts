// Every house journal reads stored references with the same vocabulary, including offline checks.
import type { Foreign, Vocabulary } from "../journal/vocabulary.ts";
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { protectedVocabulary } from "../keychain/positions/protected-vocabulary.ts";
import { doorJournalVocabulary } from "./door-journal-vocabulary.ts";
import { SqliteJournal } from "../storage/journal-store.ts";
export function houseJournal<P extends Foreign>(
  file: string,
  words: Vocabulary<P>,
  warn?: (warning: FoldWarning) => void,
  folds: "restore" | "preserve" = "restore",
) {
  const reading = doorJournalVocabulary(protectedVocabulary(words));
  const journal = new SqliteJournal(file, reading.words, warn, folds);
  try {
    journal.replay(null, () => null);
    reading.protect();
    return journal;
  } catch (error) {
    journal.close();
    throw error;
  }
}
