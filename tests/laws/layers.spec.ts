// The signed layer order: every remaining upward dependency is explicit and can only disappear.
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { parsed, sourceFiles, src } from "../support/sources.ts";

const layers: Readonly<Record<string, number>> = {
  fields: 0,
  texts: 0,
  journal: 1,
  house: 2,
  tools: 3,
  storage: 4,
  keychain: 5,
  adapters: 6,
  surface: 7,
  runtime: 8,
  doors: 9,
  checks: 10,
  "testing.ts": 11,
};
// Exact file-to-file debts, including types. The signed partitions preserve the existing house-specific contracts.
const upward = [
  "house/attendance.ts → tools/tool-contract.ts",
  "house/attention.ts → tools/act-definition.ts",
  "house/attention.ts → tools/tool-contract.ts",
  "house/preferences.ts → tools/act-definition.ts",
  "house/preferences.ts → tools/tool-contract.ts",
  "house/scenes.ts → tools/act-definition.ts",
  "house/scenes.ts → tools/tool-contract.ts",
  "house/state.ts → keychain/custody/house-keys.ts",
  "house/state.ts → tools/adapter-contract.ts",
  "house/state.ts → tools/calculation-contract.ts",
  "house/state.ts → tools/execute.ts",
  "house/state.ts → tools/execution/open-acts.ts",
  "house/state.ts → tools/tool-contract.ts",
  "journal/bus.ts → house/facts.ts",
  "journal/clock.ts → house/facts.ts",
  "journal/vocabulary.ts → house/facts.ts",
  "tools/identities/identity-reading.ts → surface/bridge/ports/house-ports.ts",
  "tools/identities/kit-screen.ts → surface/bridge/acts/program-acts.ts",
  "tools/identities/kit-screen.ts → surface/bridge/ports/house-ports.ts",
  "tools/identities/kit-screen.ts → surface/contract/shown-tool.ts",
  "tools/identities/kit-views.ts → surface/bridge/acts/program-acts.ts",
  "tools/identities/kit-views.ts → surface/bridge/ports/house-ports.ts",
  "tools/identities/kit-views.ts → surface/contract/missing-view.ts",
  "tools/identities/kit-views.ts → surface/contract/shown-tool.ts",
  "tools/identities/scene-reading.ts → surface/contract/shown-tool.ts",
];
const nameOf = (file: string): string => relative(src, file).split(sep).join("/");
const level = (file: string): number => {
  const layer = layers[file.split("/")[0] ?? ""];
  if (layer === undefined) throw new Error(`Unknown source layer: ${file}`);
  return layer;
};
/** Static imports, re-exports, type queries, require and dynamic imports all obey the same order. */
const importsIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) value = node.argument.literal;
    if (ts.isExternalModuleReference(node)) value = node.expression;
    if (ts.isCallExpression(node) && ["import", "require", "require.resolve"].includes(node.expression.getText()))
      value = node.arguments[0];
    if (value) found.push(ts.isStringLiteralLike(value) ? value.text : "<dynamic>");
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};
const targetOf = (file: string, specifier: string): string | undefined =>
  ts.resolveModuleName(
    specifier,
    file,
    { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
    ts.sys,
  ).resolvedModule?.resolvedFileName ??
  (specifier.startsWith(".") || isAbsolute(specifier) ? resolve(dirname(file), specifier) : undefined);
const debtChanges = (actual: readonly string[], allowed: readonly string[]) => ({
  added: actual.filter(edge => !allowed.includes(edge)),
  stale: allowed.filter(edge => !actual.includes(edge)),
});
describe("the layers of src/", () => {
  it("admits exactly the named upward dependencies, with no new or stale exception", () => {
    const files = sourceFiles();
    const known = new Set(files);
    const actual = files.flatMap(file => {
      const from = nameOf(file);
      level(from);
      const imports = importsIn(parsed(file));
      expect(imports).not.toContain("<dynamic>");
      return [...new Set(imports)]
        .map(specifier => targetOf(file, specifier))
        .filter(
          (target): target is string =>
            target !== undefined && known.has(target) && level(nameOf(target)) > level(from),
        )
        .map(target => `${from} → ${nameOf(target)}`);
    });
    expect(new Set(upward).size).toBe(upward.length);
    expect(debtChanges(actual, upward)).toEqual({ added: [], stale: [] });
  });
  it("counts type queries, re-exports and require as well as static and dynamic imports", () => {
    const code = [
      'import type { T } from "./a.ts";',
      'export { b } from "./b.ts";',
      'type T = import("./c.ts").T;',
      'const d = import("./d.ts");',
      'const e = require("./e.ts");',
      'import f = require("./f.ts");',
      'const g = require.resolve("./g.ts");',
      "const unknown = import(path);",
    ].join("\n");
    expect(importsIn(ts.createSourceFile("fixture.ts", code, ts.ScriptTarget.Latest, true))).toEqual([
      "./a.ts",
      "./b.ts",
      "./c.ts",
      "./d.ts",
      "./e.ts",
      "./f.ts",
      "./g.ts",
      "<dynamic>",
    ]);
    expect(targetOf(resolve(src, "fields/fixture.ts"), "../house/facts.js")).toBe(resolve(src, "house/facts.ts"));
    expect(level("fields/one.ts")).toBe(level("texts/one.ts"));
    expect(level("testing.ts")).toBeGreaterThan(level("checks/one.ts"));
    expect(() => level("unknown/one.ts")).toThrow("Unknown source layer");
  });
  it("rejects both a new upward edge and an exception whose import was removed", () => {
    expect(debtChanges(["house/a.ts → tools/b.ts"], [])).toEqual({
      added: ["house/a.ts → tools/b.ts"],
      stale: [],
    });
    expect(debtChanges([], ["house/a.ts → tools/b.ts"])).toEqual({
      added: [],
      stale: ["house/a.ts → tools/b.ts"],
    });
  });
});
