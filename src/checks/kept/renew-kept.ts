// Explicit release maintenance for kept test journals: no boot, service, credential or new fact.
import { deepStrictEqual } from "node:assert/strict";
import { join } from "node:path";
import { journalKept } from "../../storage/journal-store.ts";
import { houseJournal } from "../../runtime/house-journal.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { checkCalculations } from "../calculations/check-calculations.ts";
import { houseProjections } from "../../runtime/house-projections.ts";
import { keptNames } from "./kept-names.ts";
export function renewKeptJournals<X extends Program>(program: Composition<X>, folder: string): readonly string[] {
  const names = keptNames(folder);
  if (!names.length) throw new Error(`${folder} keeps no journal`);
  for (const name of names) {
    const file = join(folder, name);
    const { runner } = journalKept(file);
    if (!runner) throw new Error(`${name} has no boot identity`);
    const journal = houseJournal(file, program.words);
    try {
      journal.batch(() => {
        const folds = { ...program, by: runner };
        const replayed = checkCalculations(journal, folds);
        const { state } = houseProjections(journal, folds);
        deepStrictEqual(state(), replayed);
      });
    } finally {
      journal.close();
    }
  }
  return names;
}
