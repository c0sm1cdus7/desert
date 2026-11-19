// A definition must reach an action catalog, and every source export or catalog text must serve production.
import { existsSync, readFileSync } from "node:fs";
import { join, matchesGlob, resolve } from "node:path";
import ts from "typescript";
import { isRecord } from "../../fields/json-values.ts";
import { catalogLawTexts as words } from "../../texts/catalog-laws.texts.ts";
import { actionCatalogCoverage } from "./action-coverage.ts";
import { catalogGraph, nodeLocation, visitNodes, type CatalogGraph } from "./catalog-graph.ts";
import { factCoverage } from "./fact-coverage.ts";
import type { Repository } from "./law-files.ts";
function exported(graph: CatalogGraph, file: ts.SourceFile) {
  const module = graph.checker.getSymbolAtLocation(file);
  return module
    ? graph.checker.getExportsOfModule(module).map(item => {
        const target = item.flags & ts.SymbolFlags.Alias ? graph.checker.getAliasedSymbol(item) : item;
        const declaration = target.declarations?.[0];
        return declaration &&
          (ts.isVariableDeclaration(declaration) ||
            ts.isFunctionDeclaration(declaration) ||
            ts.isClassDeclaration(declaration) ||
            ts.isInterfaceDeclaration(declaration) ||
            ts.isTypeAliasDeclaration(declaration)) &&
          declaration.name
          ? (graph.symbol(declaration.name) ?? target)
          : target;
      })
    : [];
}
function declaredEntries(repo: Repository): Set<string> {
  const file = join(repo.root, "package.json");
  if (!existsSync(file)) return new Set();
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isRecord(data) || !isRecord(data.desert)) return new Set();
  // The gate loads these executable compositions dynamically.
  const entry = [data.desert.program, data.desert.testDistribution].filter(value => typeof value === "string");
  return new Set(entry.map(value => resolve(repo.root, value)));
}
function publicEntries(repo: Repository): string[] {
  const file = join(repo.root, "package.json");
  if (!existsSync(file)) return [];
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  const targets = (value: unknown): string[] => {
    if (typeof value === "string") return value.startsWith("./") ? [resolve(repo.root, value)] : [];
    if (Array.isArray(value)) return value.flatMap(targets);
    return isRecord(value) ? Object.values(value).flatMap(targets) : [];
  };
  return isRecord(data) ? targets(data.exports) : [];
}
export function testOnlyExports(repo: Repository, graph: CatalogGraph): string[] {
  const production = new Set([
    ...graph.production,
    ...graph.sources.filter(file => file.fileName.includes("/tests/program/") && !file.fileName.endsWith(".spec.ts")),
  ]);
  const entries = publicEntries(repo);
  const published = graph.production
    .filter(
      file =>
        file.fileName === join(repo.root, "src/testing.ts") || entries.some(entry => matchesGlob(file.fileName, entry)),
    )
    .flatMap(file => exported(graph, file));
  const exposed = declaredEntries(repo);
  for (const file of graph.sources) if (exposed.has(file.fileName)) production.add(file);
  const results: string[] = [];
  for (const file of graph.production) {
    if (file.fileName === join(repo.root, "src/testing.ts")) continue;
    for (const symbol of exported(graph, file)) {
      if (published.includes(symbol)) continue;
      const uses = [...(graph.uses.get(symbol) ?? [])];
      if (uses.some(use => !production.has(use)) && !uses.some(use => production.has(use)))
        results.push(words.exported(nodeLocation(symbol.declarations?.[0] ?? file), symbol.name));
    }
  }
  return [...new Set(results)];
}
export function unusedCatalogTexts(graph: CatalogGraph): string[] {
  const users = new Set(graph.production);
  const dead: string[] = [];
  for (const file of graph.catalog) {
    visitNodes(file, node => {
      if (!ts.isPropertyAssignment(node) || !(ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name))) return;
      if (!(
        ts.isStringLiteralLike(node.initializer) ||
        ts.isTemplateExpression(node.initializer) ||
        ts.isArrowFunction(node.initializer)
      ))
        return;
      // A message factory retains translations behind its public message object.
      for (let parent: ts.Node = node; !ts.isSourceFile(parent); parent = parent.parent) {
        if (ts.isCallExpression(parent) && ["message", "defineMessage"].includes(parent.expression.getText())) return;
      }
      const symbol = graph.symbol(node.name);
      if (symbol && ![...(graph.uses.get(symbol) ?? [])].some(file => users.has(file)))
        dead.push(words.text(nodeLocation(node), node.name.text));
    });
    for (const symbol of exported(graph, file)) {
      if (![...(graph.uses.get(symbol) ?? [])].some(file => users.has(file)))
        dead.push(words.text(nodeLocation(symbol.declarations?.[0] ?? file), symbol.name));
    }
  }
  return dead;
}
export function catalogLaws(repo: Repository, catalogs?: readonly string[]): string[] {
  const graph = catalogGraph(repo, catalogs);
  return [
    ...actionCatalogCoverage(graph),
    ...factCoverage(graph),
    ...testOnlyExports(repo, graph),
    ...unusedCatalogTexts(graph),
  ];
}
