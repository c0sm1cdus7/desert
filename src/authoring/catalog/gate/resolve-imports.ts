// Every import of a visual source, resolved to a file of the tree or named as a package. Default, named, aliased,
// namespace and barrel re-exports all resolve to the source that defines the binding, so an alias cannot hide a piece.
import { posix } from "node:path";
import ts from "typescript";
import type { Parsed, Script } from "./parse.ts";
import { scriptLine } from "./parse.ts";

export type Target = Readonly<{ kind: "file"; path: string; query: string } | { kind: "package"; name: string }
  | { kind: "unresolved"; specifier: string } | { kind: "dynamic" }>;
export type Binding = Readonly<{ local: string; imported: string }>;
export type Import = Readonly<{ specifier: string; target: Target; bindings: readonly Binding[]; typeOnly: boolean;
  form: "import" | "reexport" | "dynamic" | "require"; line: number; script: Script; node: ts.Node }>;

/** `default`, a named export, or `*` for a namespace or a whole re-export. */
export type Aliases = readonly (readonly [prefix: string, target: string])[];
export function resolveSpecifier(from: string, specifier: string, exists: (path: string) => boolean, aliases: Aliases): Target {
  const [request = "", ...rest] = specifier.split("?"), query = rest.length ? `?${rest.join("?")}` : "";
  const alias = aliases.find(([prefix]) => request.startsWith(prefix));
  const base = alias ? `${alias[1]}${request.slice(alias[0].length)}`
    : request.startsWith(".") ? posix.normalize(posix.join(posix.dirname(from), request)) : undefined;
  if (base === undefined) return { kind: "package", name: request };
  for (const candidate of [base, base.replace(/\.js$/, ".ts"), `${base}.ts`, `${base}/index.ts`]) {
    if (exists(candidate)) return { kind: "file", path: candidate, query };
  }
  return { kind: "unresolved", specifier };
}

function bindingsOf(clause: ts.ImportClause | undefined): Binding[] {
  if (!clause) return [];
  const bindings: Binding[] = [];
  if (clause.name) bindings.push({ local: clause.name.text, imported: "default" });
  const named = clause.namedBindings;
  if (named && ts.isNamespaceImport(named)) bindings.push({ local: named.name.text, imported: "*" });
  if (named && ts.isNamedImports(named)) for (const element of named.elements) {
    bindings.push({ local: element.name.text, imported: (element.propertyName ?? element.name).text });
  }
  return bindings;
}

export function importsOf(path: string, parsed: Parsed, exists: (path: string) => boolean, aliases: Aliases): readonly Import[] {
  const found: Import[] = [];
  for (const script of parsed.scripts) {
    const at = (node: ts.Node) => scriptLine(parsed, script, node);
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause, specifier = node.moduleSpecifier.text;
        found.push({ specifier, target: resolveSpecifier(path, specifier, exists, aliases), bindings: bindingsOf(clause),
          typeOnly: Boolean(clause?.isTypeOnly), form: "import", line: at(node), script, node });
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text, clause = node.exportClause;
        const bindings: Binding[] = clause && ts.isNamedExports(clause)
          ? clause.elements.map(element => ({ local: element.name.text, imported: (element.propertyName ?? element.name).text }))
          : [{ local: "*", imported: "*" }];
        found.push({ specifier, target: resolveSpecifier(path, specifier, exists, aliases), bindings, typeOnly: node.isTypeOnly,
          form: "reexport", line: at(node), script, node });
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || ts.isIdentifier(node.expression) && node.expression.text === "require")) {
        const first = node.arguments[0], form = node.expression.kind === ts.SyntaxKind.ImportKeyword ? "dynamic" : "require";
        const target: Target = first && ts.isStringLiteral(first) ? resolveSpecifier(path, first.text, exists, aliases) : { kind: "dynamic" };
        found.push({ specifier: first && ts.isStringLiteral(first) ? first.text : "", target, bindings: [], typeOnly: false, form, line: at(node), script, node });
      }
      ts.forEachChild(node, visit);
    };
    visit(script.file);
  }
  return Object.freeze(found);
}

/** The file that defines `name` as exported by `path`, following re-exports and import-then-export barrels. */
export function definingFile(path: string, name: string, imports: (path: string) => readonly Import[],
  exported: (path: string) => ReadonlyMap<string, string>, seen = new Set<string>()): string | undefined {
  const key = `${path}#${name}`;
  if (seen.has(key)) return undefined;
  seen.add(key);
  if (path.endsWith(".svelte")) return name === "default" ? path : undefined;
  for (const item of imports(path)) if (item.form === "reexport" && item.target.kind === "file") {
    for (const binding of item.bindings) {
      if (binding.local === name) return definingFile(item.target.path, binding.imported, imports, exported, seen);
      if (binding.local === "*") { const found = definingFile(item.target.path, name, imports, exported, seen); if (found) return found; }
    }
  }
  const local = exported(path).get(name);
  if (local === undefined) return undefined;
  for (const item of imports(path)) if (item.form === "import" && item.target.kind === "file") {
    const binding = item.bindings.find(candidate => candidate.local === local);
    if (binding) return binding.imported === "*" ? item.target.path : definingFile(item.target.path, binding.imported, imports, exported, seen);
  }
  return path;
}

/** Exported name → local name, for `export { a as b }` and `export const/function/class` declarations. */
export function exportedNames(parsed: Parsed): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const { file } of parsed.scripts) for (const statement of file.statements) {
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) names.set(element.name.text, (element.propertyName ?? element.name).text);
    }
    const exported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    // `export const X: T = Owner;` re-exports the binding Owner under the name X (adapter-catalog.ts is written this way).
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const initializer = declaration.initializer;
      names.set(declaration.name.text, initializer && ts.isIdentifier(initializer) ? initializer.text : declaration.name.text);
    }
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) names.set(statement.name.text, statement.name.text);
    if (ts.isExportAssignment(statement)) names.set("default", "default");
  }
  return names;
}
