import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { installablePackage } from "../support/installable-package.ts";
import { loadProgram } from "../program/load.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { programImports } from "../../src/checks/laws/program-imports.ts";

for (const file of ["program.ts", "notes.ts"])
  it(`rejects the auditor's testing reexport from ${file} before evaluating either entry`, async () => {
    const repo = installablePackage();
    const path = join(repo.root, "src", file);
    const marker = join(repo.root, "evaluated");
    writeFileSync(
      path,
      readFileSync(path, "utf8") +
        '\nexport { houseRouter, startHouse, localPorts, maintainHouseCustody } from "desert/testing";',
    );
    writeFileSync(
      join(repo.root, "tests/distribution.ts"),
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "evaluated");`,
    );
    expect(programImports(repo)).toContain(`src/${file} → desert/testing`);
    expect(programSecretBoundaries(repo.root)).toContain(`src/${file} → desert/testing`);
    await expect(loadProgram(repo.root)).rejects.toThrow(`src/${file} → desert/testing`);
    expect(existsSync(marker)).toBe(false);
  });

it.each([
  "export const leaked = process;",
  "export const leaked = globalThis;",
  "export const leaked = import.meta;",
  "export const leaked = import.meta.dirname;",
  "export const leaked = import.meta.resolve;",
  "export const leaked = (() => 0).constructor;",
  "const other = { code: [import.meta.dirname] };",
])("inspects the principal like its tools: %s", code => {
  const repo = installablePackage();
  const path = join(repo.root, "src/program.ts");
  writeFileSync(path, readFileSync(path, "utf8") + "\n" + code);
  expect(programSecretBoundaries(repo.root).length).toBeGreaterThan(0);
});

it("rejects the principal before evaluating the test distribution even with allowed imports", async () => {
  const repo = installablePackage();
  const path = join(repo.root, "src/program.ts");
  writeFileSync(path, readFileSync(path, "utf8") + "\nexport const leaked = process;\n");
  writeFileSync(join(repo.root, "tests/distribution.ts"), 'throw new Error("evaluated distribution");');
  await expect(loadProgram(repo.root)).rejects.toThrow(" → process");
});

it.each([
  "const constructor = (value: unknown) => value; constructor({ code: [import.meta.dirname] });",
  "const other = defineProgram({ ...metadata, code: [import.meta.filename] }, {});",
  "const other = defineProgram({ ...metadata, code: [import.meta.resolve('./notes.ts')] }, {});",
])("does not extend the directory exception: %s", code => {
  const repo = installablePackage();
  const path = join(repo.root, "src/program.ts");
  writeFileSync(path, readFileSync(path, "utf8") + "\n" + code);
  expect(programSecretBoundaries(repo.root).some(reason => reason.endsWith(" → import.meta"))).toBe(true);
});

it("accepts the Notas declaration and export alias, with testing confined to specs", async () => {
  const repo = installablePackage();
  const path = join(repo.root, "src/program.ts");
  writeFileSync(path, readFileSync(path, "utf8") + "\nexport { program as notes };\n");
  writeFileSync(join(repo.root, "src/program.spec.ts"), 'import { startHouse } from "desert/testing";');
  expect(programImports(repo)).toEqual([]);
  expect(programSecretBoundaries(repo.root)).toEqual([]);
  expect((await loadProgram(repo.root)).program.registry.map(tool => tool.id)).toContain("toy");
});
