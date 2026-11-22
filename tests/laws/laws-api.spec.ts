// Programs depend on these exported names, including types: internal moves must fail here first.
import { expect, it } from "vitest";
import ts from "typescript";
import { join } from "node:path";
import { root } from "../support/sources.ts";

const names = [
  "importCycles",
  "strayImports",
  "outsideAccess",
  "outsideGlobals",
  "longFiles",
  "longLines",
  "repeatedClasses",
  "unsafeCasts",
  "switchedOffChecks",
  "looseCompiler",
  "readLint",
  "ignoredFiles",
  "looseRules",
  "gateScripts",
  "packageShape",
  "skippedTests",
  "strayTests",
  "uncollectedTests",
  "uncataloguedWords",
  "staleWordExemptions",
  "hiddenRules",
  "messageCoverage",
  "instructionFiles",
  "programLaws",
  "uncoveredCode",
  "Repository",
  "Exemptions",
  "ImportOptions",
  "OutsideOptions",
  "LintReading",
  "WordOptions",
  "PromptOptions",
  "RuleExemptions",
  "interfaceCode",
  "InterfaceOptions",
  "spanishNames",
  "spanishWordsOf",
  "wordsOf",
  "NameOptions",
];
it("preserves the public laws entry's value and type exports", () => {
  const file = join(root, "src/laws.ts");
  const program = ts.createProgram([file], { noEmit: true, allowImportingTsExtensions: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const symbol = source && checker.getSymbolAtLocation(source);
  expect(symbol).toBeDefined();
  const exported = symbol ? checker.getExportsOfModule(symbol).map(symbol => symbol.name) : [];
  expect(exported.sort()).toEqual([...names].sort());
});
