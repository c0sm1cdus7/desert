import { writeFileSync, mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { programImports } from "./program-imports.ts";
import { programLaws } from "./program-laws.ts";
import { lawRepository, lawPackage } from "../../../tests/support/law-repository.ts";

const manifest = (dependencies: unknown = []) =>
  JSON.stringify({
    ...lawPackage,
    desert: { ...lawPackage.desert, testDistribution: "tests/distribution.ts", dependencies },
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
