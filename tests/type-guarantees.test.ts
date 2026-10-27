import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

test("negative type examples fail at their intended lines without suppression", () => {
  const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
  const files = ["tests/types-contracts.ts", "tests/types-distributions.ts", "tests/types-dependencies.ts",
    "tests/types-public-catalog.ts", "tests/types-catalog-props.ts", "tests/types-domain-closures.ts"].map(file => resolve(file));
  const expected = new Map(files.map(file => {
    const lines = readFileSync(file, "utf8").split("\n");
    return [file, lines.flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : [])];
  }));
  const host = ts.createCompilerHost(config.options);
  const read = host.readFile.bind(host);
  host.readFile = file => {
    const source = read(file);
    return files.includes(resolve(file)) ? source?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : source;
  };
  const program = ts.createProgram(config.fileNames, config.options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  for (const [file, lines] of expected) {
    const actual = diagnostics.filter(diagnostic => diagnostic.file && resolve(diagnostic.file.fileName) === file)
      .map(diagnostic => diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start!).line);
    assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), lines, file);
  }
  assert.equal(diagnostics.some(diagnostic => !diagnostic.file || !files.includes(resolve(diagnostic.file.fileName))), false);
});
