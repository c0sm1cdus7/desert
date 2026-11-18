// Conserva diagnósticos de apertura fuera del diario y de la salida de la terminal.
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { journalTexts } from "../texts/journal.texts.ts";
export function storageNotices(home?: string) {
  const warnings: FoldWarning[] = [];
  return {
    warn: (warning: FoldWarning) => {
      if (home)
        appendFileSync(
          join(home, "storage-notices.jsonl"),
          `${JSON.stringify({ code: journalTexts.rebuildCode, ...warning })}\n`,
          { mode: 0o600 },
        );
      warnings.push(Object.freeze({ ...warning }));
    },
    read: (): readonly FoldWarning[] => [...warnings],
  };
}
