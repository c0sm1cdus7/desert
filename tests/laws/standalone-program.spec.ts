import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { loadProgram } from "../program/load.ts";
import { checkProgramCode } from "../program/code.ts";
import { programGroups } from "../program/registration.ts";
import { programChecks } from "../../src/checks/program-checks.ts";
import { installablePackage } from "../support/installable-package.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";

it.each([false, true])(
  "runs the same program checks and repository laws for the linked standalone toy, shortcut=%s",
  async shortcut => {
    const repo = installablePackage(shortcut);
    const composed = await loadProgram(repo.root);
    checkProgramCode(composed);
    expect(composed.where).toBe("tests/distribution.ts");
    const groups = programGroups(composed);
    const derived = groups[0]?.checks ?? [];
    expect(derived.map(check => check.name)).toEqual(
      programChecks(composed.program, composed.shown).map(check => check.name),
    );
    expect(derived.length).toBeGreaterThan(10);
    for (const group of groups) {
      for (const check of group.checks) {
        try {
          await check.run();
        } catch (error) {
          throw new Error(`${group.name}: ${check.name}`, { cause: error });
        }
      }
    }
  },
  60000,
);
it("rejects a fixture that composes another artifact", async () => {
  const repo = installablePackage();
  const path = join(repo.root, "tests/distribution.ts");
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("programas: [toy]", "programas: [{ ...toy, version: '2.0.0' }]"),
  );
  await expect(loadProgram(repo.root)).rejects.toThrow("does not compose the declared program artifact");
});
it("rejects a distribution import before evaluating the program", async () => {
  const repo = installablePackage();
  writeFileSync(join(repo.root, "src/program.ts"), 'import "void/program"; throw new Error("evaluated");');
  await expect(loadProgram(repo.root)).rejects.toThrow("src/program.ts → void/program");
});
it.each([
  'import { startHouse } from "desert/runtime";',
  'import { SecretResolver } from "desert/testing";',
  'import { readFileSync } from "node:fs";',
  'import { program } from "./program.ts";',
])("keeps the secret boundary closed for an installed tool: %s", code => {
  const repo = installablePackage();
  const path = join(repo.root, "src/notes.ts");
  writeFileSync(path, `${code}\n${readFileSync(path, "utf8")}`);
  expect(programSecretBoundaries(repo.root).length).toBeGreaterThan(0);
});
it("rejects tools hidden in the installable program's privileged declaration", () => {
  const repo = installablePackage();
  const path = join(repo.root, "src/program.ts");
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace(
      'import { notes } from "./notes.ts";',
      "const notes = { acts: { run: () => process.env } };",
    ),
  );
  expect(programSecretBoundaries(repo.root).some(reason => reason.includes("composition"))).toBe(true);
});
