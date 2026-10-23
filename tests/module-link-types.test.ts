import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("module links and public references preserve exact owned identities and View ports", () => {
  const fixture = resolve("tests/fixtures/module-link-types.ts");
  const expected = readFileSync(fixture, "utf8").split("\n")
    .flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd()).options;
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.readFile = file => resolve(file) === fixture
    ? read(file)?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : read(file);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  const errors = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture);
  const actual = errors.map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: file => file, getNewLine: () => "\n",
  }));
});
