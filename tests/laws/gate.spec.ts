import { readFileSync } from "node:fs";
import { join } from "node:path";
import { programPartCount } from "../program/parts.ts";
import { field as fieldOf } from "../contract/json.ts";
import { filesUnder, fromRoot, ownCode } from "../support/sources.ts";
import {
  readLint,
  ignoredFiles,
  looseRules,
  gateScripts,
  packageShape,
  strayTests,
  skippedTests,
  uncollectedTests,
} from "../../src/checks/laws/gate.ts";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
const repo = { root, code: ownCode };
const readings = await readLint(repo);

describe("law 12: a gate that cannot be cheated", () => {
  it("lints every file of src and tests, and ignores none of them", () => {
    expect(ignoredFiles(repo, readings)).toEqual([]);
  });

  it("holds every rule it stands on at error, no looser than its limit, and refuses inline configuration", () => {
    expect(looseRules(repo, { readings, maxLines: 300 })).toEqual([]);
  });

  it("runs every check, with the linter over everything and no warning allowed", () => {
    expect(gateScripts(repo)).toEqual([]);
  });

  it("is a private package that runs TypeScript without a loader", () => {
    expect(packageShape(repo, "desert")).toEqual([]);
  });

  it("limits the relocation bridge to test support inside this worktree", () => {
    const config: unknown = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"));
    expect(fieldOf(fieldOf(config, "compilerOptions"), "rootDirs")).toEqual(["tests/support", "../tests/support"]);
  });

  it("collects every spec in the gate", () => {
    expect(uncollectedTests(repo, { base: null })).toEqual([]);
    expect(strayTests(repo, { base: null })).toEqual([]);
  });

  it("keeps every program part on disk exactly once, with its own index", () => {
    const files = filesUnder(join(root, "tests/program"), path => path.endsWith(".checks.ts")).sort(
      (a, b) => Number(a.match(/part-(\d+)/)?.[1]) - Number(b.match(/part-(\d+)/)?.[1]),
    );
    const expected = Array.from({ length: programPartCount }, (_, part) => `tests/program/part-${part}.checks.ts`);
    expect(files.map(fromRoot)).toEqual(expected);
    files.forEach((file, part) => {
      expect(readFileSync(file, "utf8").trim()).toBe(
        `import { runProgramPart } from "./run.ts";\n\nawait runProgramPart(${part});`,
      );
    });
  });

  it("skips no test and focuses on none", () => {
    expect(skippedTests(repo)).toEqual([]);
  });
});
