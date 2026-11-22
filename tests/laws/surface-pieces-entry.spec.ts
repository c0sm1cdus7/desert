// desert/surface/pieces is for painters: a browser can load it, and no program may import it.
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
/** The pieces, the three files of the contract they speak, and the one catalog they read: nothing else. */
const allowed = (at: string): boolean =>
  at.startsWith("src/surface/pieces/") ||
  ["contract", "tones", "hint-sends"].some(name => at === `src/surface/contract/${name}.ts`) ||
  at === "src/texts/surface.texts.ts";
/** What the entry's static import closure reaches that a browser bundle could not take, each named. */
function unsafeIn(entry: string): readonly string[] {
  const seen = new Set<string>();
  const unsafe: string[] = [];
  const queue = [entry];
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const at = relative(root, file);
    if (!allowed(at)) unsafe.push(`${at}: outside the pieces, their contract and their catalog`);
    for (const specifier of specifiersIn(file)) {
      if (specifier.startsWith(".")) queue.push(resolve(dirname(file), specifier));
      else unsafe.push(`${at} → ${specifier}${isBuiltin(specifier) ? " (node)" : ""}`);
    }
  }
  return unsafe;
}

describe("the public entry desert/surface/pieces", () => {
  const entry = join(root, "src/surface/pieces/public-pieces.ts");
  it("is published, at the bank's own module", () => {
    expect(exportsOf()["./surface/pieces"]).toBe("./src/surface/pieces/public-pieces.ts");
    expect(existsSync(entry)).toBe(true);
  });
  it("imports nothing a browser cannot load: no node module, no package, nothing but its three folders", () => {
    expect(unsafeIn(entry)).toEqual([]);
  });
  it("names what is unsafe in a planted closure", () => {
    expect(unsafeIn(join(root, "src/surface/contract/wire.ts"))).toContain(
      "src/surface/contract/wire.ts: outside the pieces, their contract and their catalog",
    );
    expect(unsafeIn(join(root, "src/doors/terminal/paint.ts")).length).toBeGreaterThan(0);
  });
  it("is no program entry: a program never draws", () => {
    expect(isProgramEntry("desert/surface/pieces")).toBe(false);
  });
});
