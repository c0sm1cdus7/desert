import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  readLint,
  ignoredFiles,
  looseRules,
  gateScripts,
  packageShape,
  skippedTests,
  strayTests,
  uncollectedTests,
} from "./gate.ts";
import { lawRepository } from "../../../tests/support/law-repository.ts";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { escapesIn } from "./gate.ts";

describe("law 12: a gate that cannot be cheated", () => {
  it("finds a skipped, a focused and an unfinished test", () => {
    const code = [
      'it.only("a", f); describe.skip("b", f); it.each(cases).skip;',
      'test.todo("c"); it.fails("unknown", f); it("d", f); x.skip;',
    ].join(" ");
    const source = ts.createSourceFile("s.ts", code, ts.ScriptTarget.Latest, true);
    expect(escapesIn(source)).toEqual(["it.only", "describe.skip", "it.each(cases).skip", "test.todo", "it.fails"]);
  });
});

it("catches ignored files and relaxed rules from a real temporary ESLint configuration", async () => {
  const repo = lawRepository({ "eslint.config.js": 'export default [{ ignores: ["src/**"] }];' });
  const readings = await readLint(repo);
  expect(ignoredFiles(repo, readings)).toContain("src/a.ts");
  expect(looseRules(repo, { readings, maxLines: 300 })).toContain("src/a.ts: max-lines");
  expect(looseRules(repo, { readings, maxLines: null })).not.toContain("src/a.ts: max-lines");
  expect(looseRules(repo, { readings, maxLines: null })).toContain("src/a.ts: max-len");
  expect(ignoredFiles(repo, [])).toContain("src/a.ts");
});
it("catches a weakened gate, a public package, stray tests and skipped tests", () => {
  const repo = lawRepository({
    "package.json": '{"name":"other","private":false,"engines":{"node":">=22"}}',
    "tests/stray.test.ts": 'it.only("focused", f);',
  });
  expect(gateScripts(repo)).toEqual(["gate", "lint"]);
  expect(packageShape(repo, "fixture")).toEqual(["name", "private", "engines"]);
  expect(skippedTests(repo)).toEqual(["tests/stray.test.ts: it.only"]);
  expect(strayTests(repo, { base: null })).toEqual(["tests/stray.test.ts"]);
  writeFileSync(join(repo.root, "tests/stray.test.ts"), 'it("ordinary", f);');
  expect(skippedTests(repo)).toEqual([]);
});

it("catches a runner that leaves specs or derived program checks out", () => {
  const repo = lawRepository({});
  expect(uncollectedTests(repo, { base: null })).toEqual([]);
  writeFileSync(join(repo.root, "vitest.config.ts"), 'export default { test: { include: ["src/a.spec.ts"] } };');
  expect(uncollectedTests(repo, { base: null })).toEqual(["vitest.config.ts: include"]);
  writeFileSync(join(repo.root, "package.json"), "{}");
  expect(uncollectedTests(repo, { base: null })).toContain("package.json: desert.program");
});
