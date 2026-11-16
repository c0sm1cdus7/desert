// Startup diagnostics belong to the opening instance, never to the journal's facts.
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { journalTexts } from "../texts/journal.texts.ts";
export const snapshotWarning = ({ name, reason }: FoldWarning): void =>
  process.emitWarning(journalTexts.rebuildNotice(name, reason), {
    code: journalTexts.rebuildCode,
    type: "StorageNotice",
  });
export function storageNotices() {
  const warnings: FoldWarning[] = [];
  return {
    warn: (warning: FoldWarning) => {
      warnings.push(Object.freeze({ ...warning }));
      snapshotWarning(warning);
    },
    read: (): readonly FoldWarning[] => [...warnings],
  };
}
