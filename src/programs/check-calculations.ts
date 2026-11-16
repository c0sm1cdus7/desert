import { checkStateInput } from "./check-state-input.ts";
// Derive purity from every fact reached by cases, walks and kept journals, including nested collections.
import { deepStrictEqual } from "node:assert/strict";
import type { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { frozenState } from "../journal/frozen-state.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import type { Program, State } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import type { HouseFolds } from "./house-projections.ts";
export function checkCalculations<X extends Program>(journal: SqliteJournal<X["fact"]>, folds: HouseFolds<X>) {
  const initial: State<X> = structuredClone(startState<X>(folds.slices, folds.by, folds.identities));
  return journal.replay(initial, (state, event) => {
    checkStateInput(event);
    const before: State<X> = structuredClone(state);
    const next = toolsStep<X>(frozenState(state), event, folds.slices);
    deepStrictEqual(state, before, journalTexts.calculationMutated);
    // Remove protective own methods from collections before the next step, preserving serializable state.
    return structuredClone(next);
  });
}
