// The runtime's single saved-fold decision supplies the upgrade evidence, not a second decoder.
import { deepStrictEqual } from "node:assert/strict";
import { houseJournal } from "../adapters/storage/house-journal.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { houseProjections } from "./house-projections.ts";
import { checkCalculations } from "./check-calculations.ts";
export function upgradeComparison<X extends Program>(
  program: Composition<X>,
  file: string,
  runner: string,
  name = file,
) {
  const journal = houseJournal(file, program.words);
  try {
    const folds = { ...program, by: runner };
    const { state, clock } = houseProjections<X>(journal, folds);
    const status = journal.restoration();
    const compare = () =>
      deepStrictEqual(
        { state: state(), clock: clock() },
        { state: checkCalculations(journal, folds), clock: journal.replay<Deadlines>(new Map(), clockStep) },
        journalTexts.upgradeMismatch(name),
      );
    // Keep status visible even when comparison fails; report before asserting in the caller.
    return { status, compare, close: () => journal.close() };
  } catch (error) {
    journal.close();
    throw error;
  }
}
