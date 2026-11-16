// Runtime and upgrade checks restore the same complete house and clock before any effect or boot.
import { calculationIdentity, requireProjectionVersion } from "./calculation-version.ts";
import type { CalculationVersion } from "../tools/calculation-contract.ts";
import type { SqliteJournal } from "../storage/journal-store.ts";
import { baseProjectionVersion } from "./projection-version.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import type { Vocabulary } from "../journal/facts.ts";
import { shapeOf } from "../journal/projections.ts";
import type { Program, Slices } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../house/state.ts";
export { requireProjectionVersion } from "./calculation-version.ts";
export type HouseFolds<X extends Program> = Readonly<{
  by: string;
  identities?: boolean;
  words: Vocabulary<X["fact"]>;
  slices: Slices<X>;
  projectionVersion: CalculationVersion;
}>;
export function houseProjections<X extends Program>(journal: SqliteJournal<X["fact"]>, folds: HouseFolds<X>) {
  const { by, words, slices, projectionVersion } = folds;
  requireProjectionVersion(projectionVersion);
  const initial = startState<X>(slices, by, folds.identities);
  const identity = shapeOf(
    baseProjectionVersion,
    calculationIdentity(projectionVersion),
    JSON.stringify(words.event),
    startState<X>(slices, "", folds.identities),
  );
  const prefix = `house@${identity}:`;
  const clock = journal.watch<Deadlines>(`${prefix}clock:${by}`, new Map(), clockStep, identity);
  const state = journal.watch(
    `${prefix}tools:${by}`,
    initial,
    (state, event) => toolsStep<X>(state, event, slices),
    identity,
  );
  journal.restore(prefix, true);
  return { state, clock };
}
