import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { sourceFiles, root } from "../support/sources.ts";
import { contains } from "./secret-types.ts";
function exposed(addition = "", startup = false) {
  const name = startup ? "ToolStartup" : "ActContext";
  const file = join(root, `src/tools/${startup ? "startup-contract" : "tool-contract"}.ts`);
  const options: ts.CompilerOptions = {
    noEmit: true,
    skipLibCheck: true,
    module: ts.ModuleKind.NodeNext,
    allowImportingTsExtensions: true,
  };
  const host = ts.createCompilerHost(options),
    original = host.getSourceFile.bind(host);
  host.getSourceFile = (path, language, ...args) => {
    const source = original(path, language, ...args);
    if (path !== file || !source || !addition) return source;
    const code =
      source.text.replace(
        `${name}<X extends Program> = ToolCapabilities &`,
        `${name}<X extends Program> = ToolCapabilities & Borrowed &`,
      ) + `\n${addition}`;
    return ts.createSourceFile(path, code, language, true);
  };
  const program = ts.createProgram([file], options, host),
    checker = program.getTypeChecker();
  const source = program.getSourceFile(file),
    symbol = source && checker.getSymbolAtLocation(source);
  const context = symbol && checker.getExportsOfModule(symbol).find(item => item.name === name);
  if (!context) throw new Error("Missing context");
  const custody = new Set(
    sourceFiles().filter(
      path => path.includes("/adapters/") || path.includes("/keychain/") || path.endsWith("/tools/adapter-contract.ts"),
    ),
  );
  return contains(checker.getDeclaredTypeOfSymbol(context), checker, custody);
}
for (const startup of [false, true])
  it(`the ${startup ? "startup" : "action"} context cannot carry custody under any property name`, () => {
    expect(exposed("", startup)).toBe(false);
  });
for (const startup of [false, true])
  it(`detects a renamed resolver in the ${startup ? "startup" : "action"} context`, () => {
    expect(
      exposed(
        `import type { SecretResolver as Renamed } from './adapter-contract.ts';
    type Alias = Renamed; type Borrowed = { unrelated: Alias };`,
        startup,
      ),
    ).toBe(true);
  });
