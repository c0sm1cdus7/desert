import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("View program positive authoring compiles and forbidden semantics fail at their exact lines", () => {
  const fixture = resolve("tests/fixtures/view-program-types.ts");
  const expected = readFileSync(fixture, "utf8").split("\n")
    .flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const configuration = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configuration.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  host.readFile = file => {
    const source = read(file);
    return resolve(file) === fixture ? source?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : source;
  };
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  const actual = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture)
    .map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: file => file, getNewLine: () => "\n",
  }));
});
