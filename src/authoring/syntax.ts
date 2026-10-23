import ts from "typescript";
import { authoringEntrypoint } from "./imports.ts";
import { declarationExpression, type Scope } from "./expressions.ts";

function checkExplicitTypes(node: ts.Node): void {
  if (node.kind === ts.SyntaxKind.AnyKeyword || node.kind === ts.SyntaxKind.UnknownKeyword) {
    throw new Error("PRODUCT_ERASED_TYPE_NOT_ALLOWED");
  }
  ts.forEachChild(node, checkExplicitTypes);
}

function checkTypeSuppressions(file: ts.SourceFile): void {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, file.text);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    if (scanner.getTokenText().split(/[\r\n]/u).some(line => /^\s*(?:\/|\*)*\s*@ts-(?:ignore|nocheck|expect-error)/u.test(line))) {
      throw new Error("PRODUCT_TYPE_SUPPRESSION_NOT_ALLOWED");
    }
  }
}

export function checkDeclarations(file: ts.SourceFile, imported: (specifier: string, node: ts.Node) => void): number {
  checkTypeSuppressions(file);
  const scope: Scope = { bindings: new Set(), calls: new Map(), modules: new Set(), roots: new Set() };
  const manifest = file.fileName.endsWith(".module.ts");
  let roots = 0;
  function moduleSpecifier(node: ts.ImportDeclaration | ts.ExportDeclaration) {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) throw new Error("PRODUCT_IMPORT_NOT_ALLOWED");
    imported(node.moduleSpecifier.text, node);
    return node.moduleSpecifier.text;
  }
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = moduleSpecifier(statement);
      const clause = statement.importClause;
      if (!clause || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)
        || statement.attributes) throw new Error("PRODUCT_IMPORT_NOT_ALLOWED");
      for (const binding of clause.namedBindings.elements) {
        if (!clause.isTypeOnly && !binding.isTypeOnly) {
          scope.bindings.add(binding.name.text);
          if (specifier.endsWith(".module.ts")) scope.modules.add(binding.name.text);
          if (specifier === authoringEntrypoint) scope.calls.set(binding.name.text, (binding.propertyName ?? binding.name).text);
        }
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const binding of statement.declarationList.declarations) {
        if (ts.isIdentifier(binding.name)) scope.bindings.add(binding.name.text);
      }
    }
  }
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue;
    if (ts.isExportDeclaration(statement)) {
      if (manifest && !statement.isTypeOnly) throw new Error("MODULE_PUBLIC_BOUNDARY");
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) throw new Error("PRODUCT_EXPORT_NOT_ALLOWED");
      if (statement.moduleSpecifier) {
        const target = moduleSpecifier(statement);
        if (!statement.isTypeOnly && target.endsWith(".module.ts")) throw new Error("MODULE_MANIFEST_ACCESS");
      }
      else if (!statement.isTypeOnly) {
        for (const item of statement.exportClause.elements) {
          if (!item.isTypeOnly) declarationExpression(item.propertyName ?? item.name, scope);
        }
      }
      continue;
    }
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) {
      throw new Error(`PRODUCT_STATEMENT_NOT_ALLOWED: ${ts.SyntaxKind[statement.kind]}`);
    }
    const exported = statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword);
    for (const binding of statement.declarationList.declarations) {
      if (!ts.isIdentifier(binding.name) || !binding.initializer) throw new Error("PRODUCT_DECLARATION_NOT_ALLOWED");
      // Source identities are inferred. `satisfies` checks a contract without widening them.
      if (binding.type) throw new Error("PRODUCT_TYPE_ANNOTATION_NOT_ALLOWED");
      const value = binding.initializer;
      if (ts.isCallExpression(value) && ts.isIdentifier(value.expression)) {
        const call = scope.calls.get(value.expression.text);
        if (call === "composeProduct") {
          if (!file.fileName.endsWith(".product.ts") || !exported) throw new Error("PRODUCT_ROOT_REQUIRED");
          roots++;
          scope.roots.add(value);
        }
        if (call === "defineModule") {
          if (!manifest) throw new Error("MODULE_ENTRYPOINT_REQUIRED");
          scope.roots.add(value);
        }
      }
      if (manifest && exported && !(ts.isCallExpression(value) && ts.isIdentifier(value.expression)
        && scope.calls.get(value.expression.text) === "defineModule")) throw new Error("MODULE_PUBLIC_BOUNDARY");
      declarationExpression(value, scope);
    }
  }
  checkExplicitTypes(file);
  return roots;
}
