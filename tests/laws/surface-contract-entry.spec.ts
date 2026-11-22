// desert/surface/contract is for renderers and doors: its imports are browser-safe, and no program may import it.
import { existsSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { isProgramEntry } from "../../src/checks/laws/program-imports.ts";
import { root } from "../support/sources.ts";

const exportsOf = (): Readonly<Record<string, unknown>> => {
  const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const found = typeof pkg === "object" && pkg !== null && "exports" in pkg ? pkg.exports : undefined;
  return typeof found === "object" && found !== null ? Object.fromEntries(Object.entries(found)) : {};
};
/** Every module specifier a source names: imports, re-exports, type imports, dynamic imports and require. */
function specifiersIn(file: string): readonly string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) value = node.argument.literal;
    if (ts.isCallExpression(node) && ["import", "require"].includes(node.expression.getText(source)))
      value = node.arguments[0];
    if (value) found.push(ts.isStringLiteralLike(value) ? value.text : "<dynamic>");
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
const allowedFolders = ["src/surface/contract/", "src/texts/"];
const allowedPackages = new Set(["@sinclair/typebox", "@sinclair/typebox/value"]);
/** What the entry's static import closure reaches that a browser bundle could not take, each named. */
function unsafeIn(entry: string): readonly string[] {
  const seen = new Set<string>();
  const unsafe: string[] = [];
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const at = relative(root, file);
    if (!allowedFolders.some(folder => at.startsWith(folder))) unsafe.push(`${at}: outside the contract and texts`);
    for (const specifier of specifiersIn(file)) {
      if (specifier.startsWith(".")) queue.push(resolve(dirname(file), specifier));
      else if (isBuiltin(specifier) || !allowedPackages.has(specifier)) unsafe.push(`${at} → ${specifier}`);
    }
  }
  return unsafe;
}

describe("the public entry desert/surface/contract", () => {
  const target = exportsOf()["./surface/contract"];
  it("is published, at the contract's own module", () => {
    expect(target).toBe("./src/surface/contract/public-contract.ts");
    expect(existsSync(join(root, "src/surface/contract/public-contract.ts"))).toBe(true);
  });
  it("imports nothing a browser cannot load: no node module, nothing but the contract, its texts and TypeBox", () => {
    expect(unsafeIn(join(root, "src/surface/contract/public-contract.ts"))).toEqual([]);
  });
  it("names what is unsafe in a planted closure", () => {
    expect(unsafeIn(join(root, "src/doors/terminal/input.ts")).length).toBeGreaterThan(0);
    expect(unsafeIn(join(root, "src/surface/contract/wire.ts"))).toEqual([]);
  });
  it("is no program entry: a program never draws", () => {
    expect(isProgramEntry("desert/surface/contract")).toBe(false);
  });
});
