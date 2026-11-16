// Compare actual cache reuse/reconstruction with full replay, before boot or effects.
import { ok } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyKeptJournal } from "../../storage/copy-kept-journal.ts";
import { journalKept } from "../../storage/journal-store.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { CodeProjectionVersion } from "../../runtime/calculation-version.ts";
import { changedCode } from "../code/code-version-check.ts";
import { upgradeComparison } from "./upgrade-comparison.ts";
import type { Check } from "../promises/promised-stage.ts";
type Restoration = ReturnType<typeof upgradeComparison>["status"];
const describe = ({ reused, warnings }: Restoration) => {
  const reasons = warnings.map(warning => `${warning.name}: ${warning.reason}`);
  return journalTexts.foldRestoration(reused, reasons);
};
function inspect<X extends Program>(
  program: Composition<X>,
  file: string,
  report: (status: Restoration) => void,
  name: string,
) {
  const home = mkdtempSync(join(tmpdir(), "desert-upgrade-"));
  try {
    const copy = join(home, "journal.sqlite");
    copyKeptJournal(file, copy);
    const { runner } = journalKept(copy, false);
    const before = upgradeComparison(program, copy, runner, name);
    try {
      report(before.status);
      before.compare();
    } finally {
      before.close();
    }
    if (!(program.projectionVersion instanceof CodeProjectionVersion)) return;
    const projectionVersion = changedCode(program.projectionVersion);
    const changed = upgradeComparison({ ...program, projectionVersion }, copy, runner, name);
    try {
      ok(!changed.status.reused, journalTexts.codeRebuildFailed);
      changed.compare();
    } finally {
      changed.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
export function keptUpgrade<X extends Program>(program: Composition<X>, file: string, name: string) {
  let report: string | undefined;
  let reused = false;
  const run = () => {
    report = journalTexts.upgradeNotProved(name);
    reused = false;
    inspect(
      program,
      file,
      status => {
        reused = status.reused;
        report = `${name}: ${describe(status)}`;
      },
      name,
    );
    if (program.projectionVersion instanceof CodeProjectionVersion) report = journalTexts.codeUpgradeProved(report);
  };
  const check: Check = {
    name: said.keptUpgrades(name),
    run: () => Promise.resolve().then(run),
    report: () => report,
  };
  return {
    ...check,
    evidence: () => {
      run();
      return reused;
    },
  };
}
export function upgradeEvidence(checks: readonly ReturnType<typeof keptUpgrade>[]): Check {
  return {
    name: journalTexts.manualEvidenceCheck,
    run: () =>
      Promise.resolve().then(() => {
        let reused = false;
        for (const check of checks) reused = check.evidence() || reused;
        ok(reused, journalTexts.noManualEvidence);
      }),
  };
}
