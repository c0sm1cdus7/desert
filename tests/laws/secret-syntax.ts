import ts from "typescript";
import { selectionEscapes } from "./secret-selection.ts";
import { programDirectory, type ProgramDeclaration } from "./program-declaration.ts";
import { forbiddenKeys } from "./secret-keys.ts";
export interface BoundaryImport {
  specifier: string;
  names: readonly string[];
  position: string;
}
/** Include type queries and reexports; a nonliteral loader never earns a static exemption. */
export function boundaryImports(source: ts.SourceFile): BoundaryImport[] {
  const found: BoundaryImport[] = [];
  const visit = (node: ts.Node): void => {
    let value: ts.Node | undefined;
    let names: string[] = [];
    if (ts.isImportDeclaration(node)) {
      value = node.moduleSpecifier;
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      if (clause?.name) names.push("default");
      if (bindings && ts.isNamedImports(bindings))
        names.push(...bindings.elements.map(item => (item.propertyName ?? item.name).text));
    }
    if (ts.isExportDeclaration(node)) {
      value = node.moduleSpecifier;
      const clause = node.exportClause;
      if (clause && ts.isNamedExports(clause))
        names = clause.elements.map(item => (item.propertyName ?? item.name).text);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      value = node.argument.literal;
      if (node.qualifier) names = [node.qualifier.getText().split(".")[0] ?? ""];
    }
    if (ts.isExternalModuleReference(node)) value = node.expression;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) value = node.arguments[0];
    if (ts.isCallExpression(node) && node.expression.getText() === "require") value = node.arguments[0];
    if (value)
      found.push({
        specifier: ts.isStringLiteralLike(value) ? value.text : "<dynamic>",
        names,
        position: sourcePosition(node),
      });
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
const globals = new Set([
  "process",
  "globalThis",
  "global",
  "window",
  "self",
  "fetch",
  "WebSocket",
  "XMLHttpRequest",
  "EventSource",
  "eval",
  "Function",
  "Reflect",
  "require",
  "module",
  "Deno",
  "Bun",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
]);
/** A member named fetch is harmless; an ambient capability, including an alias of it, is not. */
export function boundaryEscapes(
  source: ts.SourceFile,
  checker: ts.TypeChecker,
  declaration?: ProgramDeclaration,
): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && globals.has(node.text) && !ownName(node)) {
      const declarations = checker.getSymbolAtLocation(node)?.declarations ?? [];
      if (!declarations.length || declarations.every(item => item.getSourceFile().isDeclarationFile))
        found.push(`${sourcePosition(node)} → ${node.text}`);
    }
    const rules = [...forbiddenKeys(node, checker), ...selectionEscapes(node, checker)];
    if (ts.isMetaProperty(node) && !programDirectory(node, checker, declaration)) rules.push(node.getText());
    for (const rule of new Set(rules)) found.push(`${sourcePosition(node)} → ${rule}`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
function ownName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodDeclaration(parent)) &&
    parent.name === node
  );
}

export function sourcePosition(node: ts.Node): string {
  const { line, character } = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
  return `${line + 1}:${character + 1}`;
}
