import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lawRepository, lawOptions } from "../../../tests/support/law-repository.ts";
import { codeFiles, filesUnder, fromRoot, parsed, withParsedFiles } from "./law-files.ts";
import {
  importCycles,
  strayImports,
  outsideAccess,
  outsideGlobals,
  longFiles,
  longLines,
  unsafeCasts,
  switchedOffChecks,
  looseCompiler,
  repeatedClasses,
  ignoredFiles,
  looseRules,
  gateScripts,
  packageShape,
  skippedTests,
  strayTests,
  uncollectedTests,
  uncataloguedWords,
  staleWordExemptions,
  hiddenRules,
  instructionFiles,
  uncoveredCode,
} from "../../laws.ts";

it("reuses unchanged syntax only within an inspection and reads edits immediately", () => {
  const repo = lawRepository({});
  const file = join(repo.root, "src/a.ts");
  const first = withParsedFiles(() => {
    const source = parsed(file);
    expect(parsed(file)).toBe(source);
    writeFileSync(file, 'import "./a.ts";');
    expect(parsed(file)).not.toBe(source);
    expect(importCycles(repo)).toEqual(["src/a.ts"]);
    return parsed(file);
  });
  expect(withParsedFiles(() => parsed(file))).not.toBe(first);
  expect(parsed(file)).not.toBe(first);
});

it("isolates overlapping inspections and releases the scope after failure", async () => {
  const repo = lawRepository({});
  const file = join(repo.root, "src/a.ts");
  const inspect = () =>
    withParsedFiles(async () => {
      const source = parsed(file);
      await Promise.resolve();
      expect(parsed(file)).toBe(source);
      return source;
    });
  const [first, second] = await Promise.all([inspect(), inspect()]);
  expect(first).not.toBe(second);
  let failed = first;
  expect(() =>
    withParsedFiles(() => {
      failed = parsed(file);
      expect(failed).not.toBe(first);
      throw new Error("inspection failed");
    }),
  ).toThrow("inspection failed");
  expect(parsed(file)).not.toBe(failed);
});

it("reads every declared folder, retaining specs while leaving hidden folders and installed packages out", () => {
  const repo = lawRepository({
    "startup/start.ts": "export {};",
    "src/a.spec.ts": "export {};",
    "src/.hidden/a.ts": "export {};",
    "src/node_modules/a.ts": "export {};",
    "src/data.json": "{}",
  });
  expect(codeFiles({ ...repo, code: ["src", "startup"] }).map(file => fromRoot(repo.root, file))).toEqual([
    "src/a.spec.ts",
    "src/a.ts",
    "startup/start.ts",
  ]);
  expect(filesUnder(join(repo.root, "src"), path => !path.endsWith(".ts"))).toEqual([join(repo.root, "src/data.json")]);
});

it.each(["missing", "empty", "specs"])("every synchronous law stops on a %s code folder", kind => {
  const original = lawRepository({ "specs/a.spec.ts": "export {};" });
  mkdirSync(join(original.root, "empty"));
  const repo = { ...original, code: [kind] };
  const checks = [
    () => importCycles(repo),
    () => strayImports(repo, lawOptions),
    () => outsideAccess(repo, lawOptions),
    () => outsideGlobals(repo, lawOptions),
    () => longFiles(repo, 300),
    () => longLines(repo),
    () => unsafeCasts(repo),
    () => switchedOffChecks(repo),
    () => looseCompiler(repo),
    () => repeatedClasses(repo),
    () => ignoredFiles(repo, []),
    () => looseRules(repo, { readings: [], maxLines: 300 }),
    () => gateScripts(repo),
    () => packageShape(repo, "fixture"),
    () => skippedTests(repo),
    () => strayTests(repo, lawOptions),
    () => uncollectedTests(repo, lawOptions),
    () => uncataloguedWords(repo, { catalog: [], exempt: {} }),
    () => staleWordExemptions(repo, { catalog: [], exempt: {} }),
    () => hiddenRules(repo, { exempt: {} }),
    () => instructionFiles(repo, lawOptions),
    () => uncoveredCode(repo, lawOptions),
  ];
  for (const check of checks) expect(check).toThrow("no TypeScript file to check");
  writeFileSync(join(original.root, "empty/a.ts"), "export {};");
  expect(importCycles({ ...repo, code: ["empty"] })).toEqual([]);
});
