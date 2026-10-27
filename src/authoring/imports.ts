import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { messageKeysFile, messagesFolder } from "../messages/generate.ts";

export const authoringEntrypoint = "desert-sdk/src/index.ts";
/** The generated message keys of the product (plan §14): the one product file any module, view or root may import. */
export const productKeysModule = `${messagesFolder}/${messageKeysFile}`;
const owner = (file: string) => /^modules\/([^/]+)\//.exec(file)?.[1];

export function checkImport(root: string, file: string, specifier: string): string | undefined {
  if (specifier === authoringEntrypoint) return;
  if (!specifier.startsWith(".")) throw new Error(`PRODUCT_IMPORT_NOT_ALLOWED: ${specifier}`);
  const target = resolve(dirname(file), specifier);
  const sourceName = relative(root, file).split(sep).join("/");
  const targetName = relative(root, target).split(sep).join("/");
  if (targetName === ".." || targetName.startsWith("../")) throw new Error("PRODUCT_IMPORT_OUTSIDE_SOURCE");
  if (!target.endsWith(".ts")) throw new Error(`PRODUCT_IMPORT_NOT_ALLOWED: ${specifier}`);
  if (targetName === productKeysModule) return target;
  const from = owner(sourceName), to = owner(targetName);
  if (to && targetName.endsWith(".module.ts") && targetName !== `modules/${to}/${to}.module.ts`) {
    throw new Error(`MODULE_ENTRYPOINT_REQUIRED: ${targetName}`);
  }
  if (sourceName.endsWith(".view.ts") && (targetName.endsWith(".journey.ts") || targetName.endsWith(".module.ts"))) {
    throw new Error("VIEW_ACTIVITY_IMPORT");
  }
  if (from && to !== from) throw new Error(`CROSS_MODULE_IMPORT: ${sourceName} -> ${targetName}`);
  if (!from && to && !targetName.endsWith(".module.ts")) throw new Error(`PRIVATE_MODULE_IMPORT: ${targetName}`);
  return target;
}

type ImportEdge = ts.ImportDeclaration | ts.ExportDeclaration;
type CatalogOrigin = "constructor" | "catalog" | "views" | "view" | undefined;

/** Only a binding proven to originate in an SDK catalog's View projection may cross activity imports. */
export function viewImportProvenance(files: ReadonlyMap<string, ts.SourceFile>) {
  const cache = new Map<string, CatalogOrigin>();
  const active = new Set<string>();
  const targetOf = (file: string, node: ImportEdge) => node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
    ? resolve(dirname(file), node.moduleSpecifier.text) : undefined;
  function expression(file: string, node: ts.Expression): CatalogOrigin {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
      || ts.isNonNullExpression(node)) return expression(file, node.expression);
    if (ts.isIdentifier(node)) return binding(file, node.text, false);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && binding(file, node.expression.text, false) === "constructor") return "catalog";
    if (ts.isPropertyAccessExpression(node) && !node.questionDotToken) {
      const base = expression(file, node.expression);
      if (base === "catalog" && node.name.text === "views") return "views";
      if (base === "views") return "view";
    }
    return undefined;
  }
  function lookup(file: string, name: string, exported: boolean): CatalogOrigin {
    for (const statement of files.get(file)?.statements ?? []) {
      if (ts.isImportDeclaration(statement) && !exported) {
        const clause = statement.importClause;
        if (!clause || clause.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
        const imported = clause.namedBindings.elements.find(item => !item.isTypeOnly && item.name.text === name);
        if (!imported) continue;
        const original = (imported.propertyName ?? imported.name).text;
        if (ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === authoringEntrypoint) {
          return original === "moduleIndex" ? "constructor" : undefined;
        }
        const target = targetOf(file, statement);
        return target ? binding(target, original, true) : undefined;
      }
      if (ts.isVariableStatement(statement)
        && (!exported || statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword))) {
        const declaration = statement.declarationList.declarations.find(item => ts.isIdentifier(item.name) && item.name.text === name);
        if (declaration?.initializer) return expression(file, declaration.initializer);
      }
      if (exported && ts.isExportDeclaration(statement) && !statement.isTypeOnly
        && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const item = statement.exportClause.elements.find(item => !item.isTypeOnly && item.name.text === name);
        if (!item) continue;
        const original = (item.propertyName ?? item.name).text;
        const target = targetOf(file, statement);
        return binding(target ?? file, original, Boolean(target));
      }
    }
    return undefined;
  }
  function binding(file: string, name: string, exported: boolean): CatalogOrigin {
    const key = `${file}\0${exported ? "export" : "local"}\0${name}`;
    if (cache.has(key)) return cache.get(key);
    if (active.has(key)) return undefined;
    active.add(key);
    const origin = lookup(file, name, exported);
    active.delete(key);
    cache.set(key, origin);
    return origin;
  }
  return (file: string, node: ImportEdge): boolean => {
    const target = targetOf(file, node);
    if (!target) return false;
    const names = ts.isImportDeclaration(node)
      ? node.importClause && !node.importClause.isTypeOnly && node.importClause.namedBindings
        && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements : undefined
      : !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements : undefined;
    return Boolean(names?.length && names.every(item => {
      if (item.isTypeOnly) return false;
      const origin = binding(target, (item.propertyName ?? item.name).text, true);
      return origin === "views" || origin === "view";
    }));
  };
}
