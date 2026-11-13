// Probe the declared code on a disposable tree; the source release is never edited.
import { deepStrictEqual, notStrictEqual, ok } from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { journalTexts } from "../texts/journal.texts.ts";
import { CodeProjectionVersion, codeProjectionVersion } from "./calculation-version.ts";
import { checkCodeImports } from "./code-imports.ts";
import { projectionVersion } from "./projection-version.ts";
import { codeFiles } from "./code-files.ts";
export function changedCode(version: CodeProjectionVersion): CodeProjectionVersion {
  const home = mkdtempSync(join(tmpdir(), "desert-code-probe-"));
  try {
    const files = codeFiles(version.trees, version.extensions);
    checkCodeImports(files);
    const roots = version.trees.map((_, index) => join(home, String(index)));
    for (const root of roots) mkdirSync(root);
    for (const { file, name } of files) {
      const target = join(home, name);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(file, target);
    }
    // File roots retain their basename; directory roots retain their relative hierarchy.
    const declared = roots.map((root, index) => {
      const prefix = `${index}/`;
      const file = files.find(file => file.name.startsWith(prefix));
      return file && !file.name.startsWith(`${prefix}/`) ? join(home, file.name) : root;
    });
    deepStrictEqual(projectionVersion(declared, version.extensions), version.value, journalTexts.staleCode);
    const first = files[0];
    ok(first, journalTexts.noCodeEvidence);
    writeFileSync(join(home, first.name), journalTexts.codeChangeProbe, { flag: "a" });
    const changed = codeProjectionVersion(declared, version.extensions);
    notStrictEqual(changed.value, version.value, journalTexts.unchangedFingerprint);
    return changed;
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
