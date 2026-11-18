import { writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { programImports } from "./program-imports.ts";
import { programLaws } from "./program-laws.ts";
import { lawRepository, lawPackage } from "../../../tests/support/law-repository.ts";

const manifest = (dependencies: unknown = [], testDistribution = true) =>
  JSON.stringify({
    ...lawPackage,
    desert: {
      ...lawPackage.desert,
      testDistribution: testDistribution ? "tests/distribution.ts" : undefined,
      dependencies,
    },
  });
it.each([
  'import "void/program";',
  'export * from "void/program";',
  'type Void = import("void/program").Void;',
  'const distribution = import("void/program");',
  'const distribution = require("void/program");',
  'import "#distribution";',
  'import "../tests/distribution.ts";',
  'import "node:fs";',
  "const x = import(name);",
])("rejects distribution and undeclared imports in every syntax: %s", code => {
  const repo = lawRepository({ "package.json": manifest(), "src/a.ts": code });
  expect(programImports(repo)).toHaveLength(1);
});
it("admits only DESERT public paths, owned code and the exact requested contract", () => {
  const repo = lawRepository({
    "package.json": manifest([{ kind: "contract", name: "documents/fiscal" }]),
    "src/a.ts": 'import "desert/programa"; import "./b.ts"; import "documents/fiscal";',
    "src/b.ts": "export {};",
    "node_modules/documents/package.json": JSON.stringify({
      name: "documents",
      exports: { "./fiscal": "./fiscal.js" },
    }),
    "node_modules/documents/fiscal.js": "export {};",
  });
  expect(programImports(repo)).toEqual([]);
  writeFileSync(join(repo.root, "src/a.ts"), 'import "documents/private";');
  expect(programImports(repo)).toEqual(["src/a.ts → documents/private"]);
});
it("rejects a distribution disguised as a requested contract and a relative symlink", () => {
  const repo = lawRepository({
    "package.json": manifest([{ kind: "contract", name: "void" }]),
    "src/a.ts": 'import "void";',
    "node_modules/void/package.json": JSON.stringify({
      name: "void",
      main: "index.js",
      desert: { kind: "distribution" },
    }),
    "node_modules/void/index.js": "export {};",
  });
  expect(programImports(repo)).toEqual(["src/a.ts → void"]);
  mkdirSync(join(repo.root, "outside"));
  writeFileSync(join(repo.root, "outside/value.ts"), "export {};");
  symlinkSync(join(repo.root, "outside/value.ts"), join(repo.root, "src/value.ts"));
  writeFileSync(join(repo.root, "src/a.ts"), 'import "./value.ts";');
  // A file outside the declared source roots remains outside even through a symlink.
  expect(programImports(repo)).toContain("src/a.ts → ./value.ts");
});
it("runs automatically with the ordinary repository laws", async () => {
  const repo = lawRepository({ "package.json": manifest(), "src/a.ts": 'import "void/program";' });
  expect(await programLaws(repo.root)).toContain("src/a.ts → void/program");
});
it("rejects a declared distribution even before an import uses it", () => {
  const repo = lawRepository({ "package.json": manifest([{ kind: "distribution", name: "void" }]) });
  expect(programImports(repo)).toEqual(["desert.dependencies → void"]);
});
for (const testDistribution of [false, true])
  for (const entry of [
    "runtime",
    "runtime/cloud",
    "componer",
    "calculation",
    "doors/terminal",
    "doors/socket",
    "doors/keys",
    "doors/mcp",
    "doors/mcp/handler",
    "surface/house-router",
  ])
    it.each([
      `import "desert/${entry}";`,
      `export * from "desert/${entry}";`,
      `type Host = import("desert/${entry}").Host;`,
      `const host = import("desert/${entry}");`,
      `const host = require("desert/${entry}");`,
    ])(`280: rejects kernel composition and cloud entries, testDistribution=${testDistribution}: %s`, code => {
      const repo = lawRepository({ "package.json": manifest([], testDistribution), "src/a.ts": code });
      expect(programImports(repo)).toContain(`src/a.ts → desert/${entry}`);
    });

it("reports a missing test distribution even without forbidden imports", () => {
  const repo = lawRepository({ "package.json": manifest([], false) });
  expect(programImports(repo).some(reason => reason.includes("desert.testDistribution"))).toBe(true);
});
it.each([undefined, "program", "Distribution", "kernel"])("does not infer a distribution from kind=%s", kind => {
  const repo = lawRepository({
    "package.json": JSON.stringify({ ...lawPackage, desert: { ...lawPackage.desert, kind } }),
    "src/a.ts": 'export * from "desert/runtime/cloud";',
  });
  expect(programImports(repo)).toContain("src/a.ts → desert/runtime/cloud");
});
it("allows host imports only for an explicitly declared distribution", () => {
  const repo = lawRepository({
    "package.json": JSON.stringify({ ...lawPackage, desert: { ...lawPackage.desert, kind: "distribution" } }),
    "src/a.ts": ["surface/house-router", "runtime/cloud", "doors/keys", "doors/mcp/handler"]
      .map(entry => `export * from "desert/${entry}";`)
      .join("\n"),
  });
  expect(programImports(repo)).toEqual([]);
});

it.each([null, "", 3, false])("rejects an invalid testDistribution: %s", testDistribution => {
  const repo = lawRepository({
    "package.json": JSON.stringify({ ...lawPackage, desert: { ...lawPackage.desert, testDistribution } }),
  });
  expect(programImports(repo).some(reason => reason.includes("desert.testDistribution"))).toBe(true);
});
