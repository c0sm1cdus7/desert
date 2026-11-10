// A module that reaches itself again through what runs loads half-built: no production file may close a ring.
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { filesUnder, fromRoot, isSpec, parsed, src } from "../support/sources.ts";

const isTypeOnly = (clause: ts.ImportClause | undefined): boolean =>
  clause?.phaseModifier === ts.SyntaxKind.TypeKeyword;

/** An import or re-export that only brings types: `import type`, or every named binding marked `type`. */
const bringsTypesOnly = (node: ts.ImportDeclaration | ts.ExportDeclaration): boolean => {
  if (ts.isExportDeclaration(node)) {
    const named = node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements : [];
    return node.isTypeOnly || (named.length > 0 && named.every(element => element.isTypeOnly));
  }
  const clause = node.importClause;
  if (!clause) return false;
  const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : [];
  return isTypeOnly(clause) || (!clause.name && named.length > 0 && named.every(element => element.isTypeOnly));
};

/** The specifiers a module loads when it runs: value imports, re-exports, side effects and dynamic imports. */
const valueImports = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const declared = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    if (declared && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !bringsTypesOnly(node))
      found.push(node.moduleSpecifier.text);
    const dynamic = ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const [specifier] = dynamic ? node.arguments : [];
    if (specifier && ts.isStringLiteral(specifier)) found.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

/** Every ring of modules that import one another (Tarjan's strongly connected components, a self-import included). */
const ringsOf = (graph: ReadonlyMap<string, readonly string[]>): string[][] => {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const rings: string[][] = [];
  const connect = (node: string): void => {
    index.set(node, index.size);
    low.set(node, index.get(node) ?? 0);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!index.has(next)) connect(next);
      if (stack.includes(next)) low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
    }
    if (low.get(node) !== index.get(node)) return;
    const ring = stack.splice(stack.indexOf(node));
    if (ring.length > 1 || (graph.get(node) ?? []).includes(node)) rings.push(ring.sort());
  };
  for (const node of graph.keys()) if (!index.has(node)) connect(node);
  return rings;
};

describe("law 21: no import cycles among the production files", () => {
  it("no production file loads itself back through the imports that run", () => {
    const production = filesUnder(src).filter(file => !isSpec(file));
    const known = new Set(production);
    const graph = new Map(
      production.map(file => [
        file,
        valueImports(parsed(file))
          .filter(specifier => specifier.startsWith("."))
          .map(specifier => resolve(dirname(file), specifier))
          .filter(target => known.has(target)),
      ]),
    );
    expect(ringsOf(graph).map(ring => ring.map(fromRoot).join(" ⇄ "))).toEqual([]);
  });

  it("counts value imports, re-exports and dynamic imports, never the ones that bring only types", () => {
    const code = [
      'import { a } from "./a.ts";',
      'import type { B } from "./b.ts";',
      'import { type C } from "./c.ts";',
      'import { type D, d } from "./d.ts";',
      'import "./e.ts";',
      'export { f } from "./f.ts";',
      'export type { G } from "./g.ts";',
      'export * from "./h.ts";',
      'const i = import("./i.ts");',
      'type J = import("./j.ts").J;',
    ].join("\n");
    const source = ts.createSourceFile("ring.ts", code, ts.ScriptTarget.Latest, true);
    expect(valueImports(source)).toEqual(["./a.ts", "./d.ts", "./e.ts", "./f.ts", "./h.ts", "./i.ts"]);
  });

  it("finds a ring and a self-import, and leaves a chain alone", () => {
    const graph = new Map([
      ["check", ["frame"]],
      ["frame", ["turn"]],
      ["turn", ["check", "ids"]],
      ["ids", []],
      ["self", ["self"]],
      ["chain", ["ids"]],
    ]);
    expect(ringsOf(graph)).toEqual([["check", "frame", "turn"], ["self"]]);
  });
});
