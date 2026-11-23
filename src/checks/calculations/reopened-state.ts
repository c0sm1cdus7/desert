// Derived checks compare an ordinary reopen with a second reopen whose saved folds have been removed.
import { meant } from "../../fields/phrases.ts";
import { checkCalculations } from "./check-calculations.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { deepStrictEqual } from "node:assert/strict";
import { houseProjections, type HouseFolds } from "../../runtime/house-projections.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { journalKept } from "../../storage/journal-store.ts";
import { houseJournal } from "../../runtime/house-journal.ts";
function reopened<X extends Program>(file: string, folds: HouseFolds<X>) {
  const journal = houseJournal(file, folds.words);
  try {
    const { state, clock } = houseProjections(journal, folds);
    if (journal.restoration().warnings.some(warning => warning.reason === meant(journalTexts.divergentFold)))
      throw new Error(meant(journalTexts.reopenedMismatch));
    deepStrictEqual(checkCalculations(journal, folds), state(), meant(journalTexts.reopenedMismatch));
    return { state: state(), clock: clock() };
  } finally {
    journal.close();
  }
}
export function checkReopenedState<X extends Program>(file: string, folds: HouseFolds<X>): void {
  const cached = reopened(file, folds);
  journalKept(file);
  deepStrictEqual(reopened(file, folds), cached, meant(journalTexts.reopenedMismatch));
}
