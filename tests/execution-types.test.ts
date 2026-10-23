import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

test("host execution derives job input from the bound adapter and requires typed issued references", () => {
  const fixture = resolve("tests/fixtures/execution-types.ts");
  const expected = readFileSync(fixture, "utf8").split("\n")
    .flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(config.options);
  const read = host.readFile.bind(host);
  host.readFile = file => {
    const source = read(file);
    return resolve(file) === fixture ? source?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : source;
  };
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], config.options, host));
  const actual = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture)
    .map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: file => file, getNewLine: () => "\n",
  }));
});
