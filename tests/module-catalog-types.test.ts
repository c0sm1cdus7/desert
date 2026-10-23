import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("module catalog aliases preserve public reference kinds, identities and exact View outputs", () => {
  const fixture = resolve("tests/fixtures/module-catalog-types.ts");
  const source = readFileSync(fixture, "utf8");
  const expected = source.split("\n").flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const configuration = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configuration.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host), exists = host.fileExists.bind(host);
  host.readFile = file => resolve(file) === fixture ? source.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : read(file);
  host.fileExists = file => resolve(file) === fixture || exists(file);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  const actual = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture)
    .map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: file => file, getNewLine: () => "\n",
  }));
});
