import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// The workspace shell's render-slot and caller laws are catalog rules D and E (tests/catalog-ported-boundaries.test.ts).
test("workspace body contracts reject arbitrary components, cross-kind data and DOM capabilities", () => {
  const fixture = resolve("tests/fixtures/workspace-content-types.ts");
  const expected = readFileSync(fixture, "utf8").split("\n")
    .flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const configuration = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configuration.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host);
  host.readFile = path => resolve(path) === fixture ? read(path)?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : read(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  const actual = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture)
    .map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: path => path, getNewLine: () => "\n",
  }));
});
