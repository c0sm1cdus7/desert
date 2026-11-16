import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { filesUnder, fromRoot, isSpec, parsed, root, src } from "../support/sources.ts";
const files = filesUnder(src);
/** Who may reach an adapter: the programs that compose a house, adapters, tools and the surface bridges. */
const adapterUsers = ["runtime", "checks", "storage", "keychain", "adapters", "tools", join("surface", "bridge")].map(
  folder => join(src, folder),
);
const relocatedUsers = [
  "src/doors/socket/server/serve-program.ts",
  "src/doors/socket/server/server-process.ts",
  "src/doors/socket/server/socket-listener.ts",
  "src/doors/terminal/bounded-output.ts",
  "src/doors/terminal/house-output-process.ts",
  "src/doors/terminal/house-output.ts",
  "src/doors/terminal/launch-house.ts",
  "src/doors/terminal/open-terminal.ts",
  "src/doors/terminal/terminal-client.ts",
  "src/doors/terminal/terminal-error.ts",
  "src/doors/terminal/terminal-program.ts",
  "src/house/state.ts",
].map(file => join(root, file));
const adapterRoots = ["adapters", "storage", "keychain"].map(folder => join(src, folder));
const within = (folder: string, file: string): boolean => file.startsWith(`${folder}${sep}`);
const importsIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) value = node.argument.literal;
    if (ts.isExternalModuleReference(node)) value = node.expression;
    if (ts.isCallExpression(node) && ["import", "require", "require.resolve"].includes(node.expression.getText())) {
      value = node.arguments[0];
    }
    if (value) found.push(ts.isStringLiteralLike(value) ? value.text : "<dynamic>");
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};
const forbidden = (file: string, specifier: string): boolean => {
  if (specifier === "<dynamic>" || specifier.startsWith("@nestjs/")) return true;
  const resolved = ts.resolveModuleName(
    specifier,
    file,
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      rootDirs: [join(root, "tests/support"), resolve(root, "../tests/support")],
    },
    ts.sys,
  ).resolvedModule?.resolvedFileName;
  const local = specifier.startsWith(".") || isAbsolute(specifier) ? resolve(dirname(file), specifier) : undefined;
  const target = resolved ?? local;
  if (!target) return specifier.startsWith("src/");
  return (
    (!within(src, target) &&
      !/[\\/]node_modules[\\/]/.test(target) &&
      !(isSpec(file) && within(join(root, "tests", "support"), target))) ||
    (adapterRoots.some(folder => within(folder, target)) &&
      !isSpec(file) &&
      !adapterUsers.some(folder => within(folder, file)) &&
      !relocatedUsers.includes(file))
  );
};
describe("law 2: explicit dependencies and isolated adapters", () => {
  it("checks static, dynamic, re-exported and type-only dependencies, without an external-source exception", () => {
    const violations = files.flatMap(file =>
      importsIn(parsed(file))
        .filter(specifier => forbidden(file, specifier))
        .map(specifier => `${fromRoot(file)} → ${specifier}`),
    );
    expect(violations).toEqual([]);
  });
  it("detects imports hidden behind type queries, re-exports and require", () => {
    const code = [
      'import type { Event } from "../../kenon.events.ts";',
      'export { Clock } from "../../outside/clock.ts";',
      'type Old = import("../../outside/journal.ts").Journal;',
      'const old = import("../../outside/journal.ts");',
      'const other = require("../../outside/clock.ts");',
      'import old = require("../../kenon.functions.ts");',
      "const unknown = import(path);",
    ].join("\n");
    const file = join(src, "journal", "fixture.ts");
    const imports = importsIn(ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true));
    expect(imports).toHaveLength(7);
    expect(imports.every(specifier => forbidden(file, specifier))).toBe(true);
    expect(forbidden(file, "./facts.ts")).toBe(false);
    expect(forbidden(file, "node:sqlite")).toBe(false);
    expect(forbidden(file, "../adapters/providers/providers.ts")).toBe(true);
    expect(forbidden(join(src, "runtime", "house-runtime.ts"), "../adapters/providers/providers.ts")).toBe(false);
    expect(forbidden(join(src, "tools", "web", "search.ts"), "../../adapters/providers/reply.ts")).toBe(false);
    expect(forbidden(join(src, "surface", "bridge", "start.ts"), "../../storage/home.ts")).toBe(false);
    expect(forbidden(join(src, "surface", "screen.ts"), "../storage/home.ts")).toBe(true);
    expect(forbidden(join(src, "mind", "turn.ts"), "../adapters/providers/reply.ts")).toBe(true);
    expect(forbidden(join(src, "cli.ts"), "./storage/home.ts")).toBe(true);
    expect(forbidden(file, "@sinclair/typebox")).toBe(false);
    expect(forbidden(file, "../../../tests/support/next-tools.ts")).toBe(true);
    expect(
      forbidden(join(src, "surface", "bridge", "house-tools.spec.ts"), "../../../tests/support/next-tools.ts"),
    ).toBe(false);
    expect(forbidden(join(src, "mind", "turn.spec.ts"), "../adapters/providers/reply.ts")).toBe(false);
  });
});
