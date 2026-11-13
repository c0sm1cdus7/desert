// Derived checks compare an ordinary reopen with a second reopen whose saved folds have been removed.
import { journalTexts } from "../../texts/journal.texts.ts";
import { deepStrictEqual } from "node:assert/strict";
import { clockStep, type Deadlines } from "../../journal/clock.ts";
import { shapeOf } from "../../journal/projections.ts";
import type { Vocabulary } from "../../journal/events.ts";
import type { Program, Slices } from "../../tools/tool-contract.ts";
import { startState, toolsStep } from "../../tools/tools.ts";
import { journalKept, SqliteJournal } from "./journal-store.ts";
type Folds<X extends Program> = Readonly<{ by: string; words: Vocabulary<X["fact"]>; slices: Slices<X> }>;
function reopened<X extends Program>(file: string, { by, words, slices }: Folds<X>) {
  const journal = new SqliteJournal(file, words);
  try {
    const initial = startState<X>(slices, by);
    const shape = shapeOf(JSON.stringify(words.event), initial);
    const clock = journal.watch<Deadlines>(`clock@${shape}`, new Map(), clockStep);
    const state = journal.watch(`tools:${by}@${shape}`, initial, (state, event) => toolsStep<X>(state, event, slices));
    journal.restore();
    return { state: state(), clock: clock() };
  } finally {
    journal.close();
  }
}
export function checkReopenedState<X extends Program>(file: string, folds: Folds<X>): void {
  const cached = reopened(file, folds);
  journalKept(file);
  deepStrictEqual(reopened(file, folds), cached, journalTexts.reopenedMismatch);
}
