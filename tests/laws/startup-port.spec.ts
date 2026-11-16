import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
import { root, sourceFiles } from "../support/sources.ts";
import { contains } from "./secret-types.ts";
function portExposed(addition = "") {
  const file = join(root, "src/tools/startup-contract.ts");
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
        "ToolStartup<X extends Program> = ToolCapabilities &",
        "ToolStartup<X extends Program> = ToolCapabilities & Borrowed<X> &",
      ) + `\n${addition}`;
    return ts.createSourceFile(path, code, language, true);
  };
  const program = ts.createProgram([file], options, host),
    checker = program.getTypeChecker();
  const source = program.getSourceFile(file),
    symbol = source && checker.getSymbolAtLocation(source);
  const startup = symbol && checker.getExportsOfModule(symbol).find(item => item.name === "ToolStartup");
  const act = startup && checker.getDeclaredTypeOfSymbol(startup).getProperty("act");
  if (!act) throw new Error("Missing mind port");
  const forbidden = new Set(
    sourceFiles().filter(
      path =>
        path.includes("/adapters/") ||
        path.endsWith("/tools/execution-contract.ts") ||
        path.endsWith("/tools/tool-contract.ts"),
    ),
  );
  return contains(checker.getTypeOfSymbolAtLocation(act, source), checker, forbidden);
}
it("212: the mind port returns no execution, registry, custody or resolver, even nested in a promise", () => {
  expect(portExposed()).toBe(false);
});
for (const [type, from] of [
  ["Execution<X>", "./execution-contract.ts"],
  ["ToolRegistry<X>", "./tool-contract.ts"],
  ["SecretResolver", "../adapters/declared/adapter-contract.ts"],
  ["SecretVault<X>", "../adapters/secrets/secret-vault.ts"],
])
  it(`212: detects a nested ${type} returned by the mind port`, () => {
    const name = type?.split("<")[0];
    expect(
      portExposed(`import type { ${name} } from '${from}';
    type Borrowed<X extends Program> = { act: () => Promise<{ nested: { hidden: ${type} } }> };`),
    ).toBe(true);
  });
