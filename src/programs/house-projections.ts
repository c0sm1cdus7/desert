// Runtime and upgrade checks restore the same complete house and clock before any effect or boot.
import type { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { baseProjectionVersion } from "../catalogs/levers.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import type { Vocabulary } from "../journal/events.ts";
import { shapeOf } from "../journal/projections.ts";
import type { Program, Slices } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
export type HouseFolds<X extends Program> = Readonly<{
  by: string;
  words: Vocabulary<X["fact"]>;
  slices: Slices<X>;
  projectionVersion: string;
}>;
export function requireProjectionVersion(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error("An explicit projectionVersion is required");
}
export function houseProjections<X extends Program>(journal: SqliteJournal<X["fact"]>, folds: HouseFolds<X>) {
  const { by, words, slices, projectionVersion } = folds;
  requireProjectionVersion(projectionVersion);
  const initial = startState<X>(slices, by);
  const identity = shapeOf(baseProjectionVersion, projectionVersion, JSON.stringify(words.event), initial);
  const clock = journal.watch<Deadlines>(`clock@${identity}`, new Map(), clockStep, identity);
  const state = journal.watch(
    `tools:${by}@${identity}`,
    initial,
    (state, event) => toolsStep<X>(state, event, slices),
    identity,
  );
  journal.restore();
  return { state, clock };
}
