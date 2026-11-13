// Compare a real upgrade, preserving previous folds, with an independent full replay before any boot or tools.
import { journalTexts } from "../texts/journal.texts.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { journalKept, SqliteJournal } from "../adapters/storage/journal-store.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { houseProjections } from "./house-projections.ts";
import type { Check } from "./promised-stage.ts";
export function keptUpgrade<X extends Program>(program: Composition<X>, file: string, name: string): Check {
  return {
    name: said.keptUpgrades(name),
    run: () =>
      Promise.resolve().then(() => {
        const home = mkdtempSync(join(tmpdir(), "desert-upgrade-"));
        try {
          const copy = join(home, "journal.sqlite");
          copyFileSync(file, copy);
          const { runner, previous } = journalKept(copy, false);
          ok(previous, journalTexts.previousRequired(name));
          const journal = new SqliteJournal(copy, program.words);
          try {
            const { state, clock } = houseProjections<X>(journal, { ...program, by: runner });
            const again = journal.replay(startState<X>(program.slices, runner), (state, event) =>
              toolsStep<X>(state, event, program.slices),
            );
            const deadlines = journal.replay<Deadlines>(new Map(), clockStep);
            deepStrictEqual(
              { state: state(), clock: clock() },
              { state: again, clock: deadlines },
              journalTexts.upgradeMismatch(name),
            );
          } finally {
            journal.close();
          }
        } finally {
          rmSync(home, { recursive: true, force: true });
        }
      }),
  };
}
