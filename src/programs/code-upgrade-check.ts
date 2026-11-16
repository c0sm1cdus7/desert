// Even without kept organizations, code mode proves invalidation on real saved folds of this program.
import { deepStrictEqual, ok } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { houseJournal } from "../adapters/storage/house-journal.ts";
import { effect } from "../journal/events.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { CodeProjectionVersion } from "./calculation-version.ts";
import { changedCode } from "./code-version-check.ts";
import { checkCalculations } from "./check-calculations.ts";
import { houseProjections } from "./house-projections.ts";
import type { Check } from "./promised-stage.ts";
export function codeUpgradeCheck<X extends Program>(program: Composition<X>): Check {
  return {
    name: journalTexts.codeUpgradeCheck,
    run: () =>
      Promise.resolve().then(() => {
        ok(program.projectionVersion instanceof CodeProjectionVersion);
        const projectionVersion = changedCode(program.projectionVersion);
        const home = mkdtempSync(join(tmpdir(), "desert-code-upgrade-"));
        const folds = { ...program, by: "code-check" };
        try {
          const file = join(home, "journal.sqlite");
          const before = houseJournal(file, program.words);
          try {
            houseProjections<X>(before, folds);
            before.append(effect("boot", {}, folds.by), 0);
          } finally {
            before.close();
          }
          const after = houseJournal(file, program.words);
          try {
            const { state } = houseProjections<X>(after, { ...folds, projectionVersion });
            ok(!after.restoration().reused, journalTexts.codeRebuildFailed);
            deepStrictEqual(state(), checkCalculations(after, folds));
          } finally {
            after.close();
          }
        } finally {
          rmSync(home, { recursive: true, force: true });
        }
      }),
  };
}
