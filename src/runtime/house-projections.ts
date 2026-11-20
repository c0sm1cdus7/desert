// Runtime and upgrade checks restore the same complete house and clock before any effect or boot.
import type { KitMigration } from "../house/kit-migration.ts";
import { calculationIdentity, requireProjectionVersion } from "./calculation-version.ts";
import type { CalculationVersion } from "../tools/calculation-contract.ts";
import type { SqliteJournal } from "../storage/journal-store.ts";
import { baseProjectionVersion } from "./projection-version.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import type { Vocabulary } from "../journal/vocabulary.ts";
import { shapeOf } from "../journal/projections.ts";
import type { Program, Slices, ToolRegistry } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../house/state.ts";
export { requireProjectionVersion } from "./calculation-version.ts";
export type HouseFolds<X extends Program> = Readonly<{
  by: string;
  registry?: ToolRegistry<X>;
  identities?: boolean;
  kitMigration?: KitMigration;
  words: Vocabulary<X["fact"]>;
  slices: Slices<X>;
  projectionVersion: CalculationVersion;
}>;
export function houseProjections<X extends Program>(journal: SqliteJournal<X["fact"]>, folds: HouseFolds<X>) {
  const { by, words, slices, projectionVersion } = folds;
  requireProjectionVersion(projectionVersion);
  const start = startState<X>(slices, by, folds.identities, folds.registry);
  const initial = folds.kitMigration
    ? { ...start, house: { ...start.house, kitMigration: folds.kitMigration } }
    : start;
  const identity = shapeOf(
    baseProjectionVersion,
    calculationIdentity(projectionVersion),
    JSON.stringify(words.event),
    startState<X>(slices, "", folds.identities, folds.registry),
    folds.kitMigration ?? null,
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
  journal.convertWith(() => state().house);
  return { state, clock };
}
