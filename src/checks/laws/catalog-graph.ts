// Resolve source symbols and consumers once so catalog laws follow aliases and helper calls.
import { existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { codeFiles, filesUnder, isSpec, type Repository } from "./law-files.ts";
const add = <K, V>(map: Map<K, Set<V>>, key: K, value: V) => {
  const values = map.get(key) ?? new Set<V>();
  values.add(value);
  map.set(key, values);
};
function reference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isPropertyAccessExpression(parent) || ts.isShorthandPropertyAssignment(parent) || ts.isExportSpecifier(parent))
    return true;
  return !("name" in parent && parent.name === node);
}
class CatalogIndex {
  readonly checker: ts.TypeChecker;
  readonly sources: readonly ts.SourceFile[];
  readonly production: readonly ts.SourceFile[];
  readonly catalog: ReadonlySet<ts.SourceFile>;
  readonly uses = new Map<ts.Symbol, Set<ts.SourceFile>>();
  private readonly edges = new Map<ts.Symbol, Set<ts.Symbol>>();
  private readonly canonical = new Map<ts.Declaration, ts.Symbol>();
  constructor(repo: Repository, catalogs: readonly string[]) {
    const files = codeFiles(repo);
    const tests = join(repo.root, "tests");
    const roots = [...files, ...(existsSync(tests) ? filesUnder(tests, path => path.endsWith(".ts")) : [])];
    const program = ts.createProgram(roots, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.NodeNext,
      allowImportingTsExtensions: true,
      skipLibCheck: true,
      noResolve: true,
      noLib: true,
      types: [],
    });
    this.checker = program.getTypeChecker();
    this.sources = program.getSourceFiles().filter(file => roots.includes(file.fileName));
    this.production = this.sources.filter(file => files.includes(file.fileName) && !isSpec(file.fileName));
    this.catalog = new Set(
      this.production.filter(file => catalogs.some(path => file.fileName.startsWith(join(repo.root, path)))),
    );
    for (const file of this.sources) this.scan(file);
  }
  readonly symbol = (node: ts.Node): ts.Symbol | undefined => {
    const found = ts.isShorthandPropertyAssignment(node.parent)
      ? this.checker.getShorthandAssignmentValueSymbol(node.parent)
      : this.checker.getSymbolAtLocation(node);
    const target = found && found.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(found) : found;
    const declaration = target?.declarations?.[0];
    if (!target || !declaration) return target;
    const original = this.canonical.get(declaration) ?? target;
    this.canonical.set(declaration, original);
    return original;
  };
  readonly owner = (node: ts.Node): ts.Symbol | undefined => {
    if (ts.isSourceFile(node)) return undefined;
    for (let parent = node.parent; !ts.isSourceFile(parent); parent = parent.parent) {
      if (
        (ts.isFunctionDeclaration(parent) ||
          ts.isVariableDeclaration(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isPropertyAssignment(parent)) &&
        parent.name
      ) {
        const found = this.symbol(parent.name);
        if (found) return found;
      }
    }
    return undefined;
  };
  private consume(node: ts.Node, file: ts.SourceFile, seen = new Set<ts.Type>()) {
    const declaration = this.symbol(node)?.declarations?.[0];
    if (declaration && ts.isPropertyAssignment(declaration) && this.catalog.has(declaration.getSourceFile())) {
      let initializer = declaration.initializer;
      while (
        ts.isAsExpression(initializer) ||
        ts.isSatisfiesExpression(initializer) ||
        ts.isParenthesizedExpression(initializer)
      )
        initializer = initializer.expression;
      if (initializer !== node && ts.isObjectLiteralExpression(initializer)) this.consume(initializer, file, seen);
    }
    const type = this.checker.getTypeAtLocation(node);
    if (seen.has(type)) return;
    seen.add(type);
    for (const property of type.getProperties()) {
      const declaration = property.declarations?.[0];
      if (!declaration || !this.catalog.has(declaration.getSourceFile()) || !ts.isPropertyAssignment(declaration))
        continue;
      const found = this.symbol(declaration.name);
      if (found) add(this.uses, found, file);
      this.consume(declaration.initializer, file, seen);
    }
  }
  /** Tests only establish use of imports; their local expressions need no type analysis. */
  private scanTest(file: ts.SourceFile) {
    const imported = new Map<string, ts.Symbol>();
    const namespaces = new Set<string>();
    visitNodes(file, node => {
      if (ts.isImportSpecifier(node) || ts.isImportClause(node) || ts.isNamespaceImport(node)) {
        const name = node.name;
        if (!name) return;
        const symbol = this.symbol(name);
        if (symbol) imported.set(name.text, symbol);
        if (ts.isNamespaceImport(node)) namespaces.add(name.text);
      }
    });
    visitNodes(file, node => {
      if (ts.isIdentifier(node) && reference(node)) {
        const symbol = imported.get(node.text);
        if (symbol) add(this.uses, symbol, file);
      }
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        namespaces.has(node.expression.text)
      ) {
        const symbol = this.symbol(node.name);
        if (symbol) add(this.uses, symbol, file);
      }
    });
  }
  private scan(file: ts.SourceFile) {
    const production = this.production.includes(file);
    if (!production) {
      this.scanTest(file);
      return;
    }
    visitNodes(file, node => {
      if (ts.isIdentifier(node) && reference(node)) {
        const found = this.symbol(node),
          from = this.owner(node);
        if (found) {
          add(this.uses, found, file);
          if (from) add(this.edges, from, found);
        }
      }
      if (
        (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isPropertyAssignment(node)) &&
        node.name
      ) {
        const outer = this.owner(node),
          inner = this.symbol(node.name);
        if (outer && inner) add(this.edges, outer, inner);
      }
      if (
        (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) &&
        !(
          ts.isPropertyAccessExpression(node.parent) ||
          ts.isElementAccessExpression(node.parent) ||
          ts.isExportSpecifier(node.parent)
        ) &&
        !(ts.isIdentifier(node) && !reference(node))
      )
        this.consume(node, file);
      if (ts.isElementAccessExpression(node) && !ts.isStringLiteralLike(node.argumentExpression))
        this.consume(node.expression, file);
    });
  }
  readonly reachable = (seeds: Iterable<ts.Symbol>) => {
    const seen = new Set(seeds),
      todo = [...seen];
    for (const from of todo)
      for (const next of this.edges.get(from) ?? [])
        if (!seen.has(next)) {
          seen.add(next);
          todo.push(next);
        }
    return seen;
  };
}
export const catalogGraph = (repo: Repository, catalogs: readonly string[] = ["src/texts/"]) =>
  new CatalogIndex(repo, catalogs);
export type CatalogGraph = ReturnType<typeof catalogGraph>;
export function visitNodes(node: ts.Node, use: (node: ts.Node) => void): void {
  use(node);
  ts.forEachChild(node, child => visitNodes(child, use));
}
export const nodeLocation = (node: ts.Node) =>
  `${node.getSourceFile().fileName}:${node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
