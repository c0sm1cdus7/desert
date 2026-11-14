// Every house journal reads stored references with the same vocabulary, including offline checks.
import type { Foreign, Vocabulary } from "../../journal/events.ts";
import type { FoldWarning } from "../../journal/snapshot-format.ts";
import { protectedVocabulary } from "../secrets/positions/protected-vocabulary.ts";
import { SqliteJournal } from "./journal-store.ts";
export function houseJournal<P extends Foreign>(
  file: string,
  words: Vocabulary<P>,
  warn?: (warning: FoldWarning) => void,
  folds: "restore" | "preserve" = "restore",
) {
  return new SqliteJournal(file, protectedVocabulary(words), warn, folds);
}
