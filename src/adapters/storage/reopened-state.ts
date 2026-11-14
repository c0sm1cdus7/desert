// Derived checks compare an ordinary reopen with a second reopen whose saved folds have been removed.
import { checkCalculations } from "../../programs/check-calculations.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { deepStrictEqual } from "node:assert/strict";
import { houseProjections, type HouseFolds } from "../../programs/house-projections.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { journalKept, SqliteJournal } from "./journal-store.ts";
function reopened<X extends Program>(file: string, folds: HouseFolds<X>) {
  const journal = new SqliteJournal(file, folds.words);
  try {
    const { state, clock } = houseProjections(journal, folds);
    if (journal.restoration().warnings.some(warning => warning.reason === journalTexts.divergentFold))
      throw new Error(journalTexts.reopenedMismatch);
    deepStrictEqual(checkCalculations(journal, folds), state(), journalTexts.reopenedMismatch);
    return { state: state(), clock: clock() };
  } finally {
    journal.close();
  }
}
export function checkReopenedState<X extends Program>(file: string, folds: HouseFolds<X>): void {
  const cached = reopened(file, folds);
  journalKept(file);
  deepStrictEqual(reopened(file, folds), cached, journalTexts.reopenedMismatch);
}
