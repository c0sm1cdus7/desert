import { posix } from "node:path";
import ts from "typescript";
import { Value } from "@sinclair/typebox/value";
import { InteractionCatalog } from "../../interaction/catalog.ts";
import { freezeDeep } from "../../json.ts";
import { WebCatalogManifestSchema, type WebCatalogDefinition } from "../../svelte/catalog-manifest-schema.ts";

export const webCatalogManifestPath = "src/svelte/catalog-manifest.ts";
const fail = (reason: string): never => { throw new Error(`WEB_CATALOG_MANIFEST: ${reason}`); };

function literal(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (!ts.isObjectLiteralExpression(node)) return fail("nonliteral registration");
  const entries = new Map<string, unknown>();
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) return fail("opaque registration");
    const key = property.name.text;
    if (key === "__proto__" || entries.has(key)) fail("duplicate or unsafe registration key");
    entries.set(key, literal(property.initializer));
  }
  return Object.fromEntries(entries);
}

/** Read the declaration as data, never import/evaluate an inspected checkout. */
export function readWebCatalogManifest(source: string): WebCatalogDefinition {
  const file = ts.createSourceFile(webCatalogManifestPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const [freeze, type, statement] = file.statements;
  if (file.statements.length !== 3 || !freeze || !type || !statement
    || !ts.isImportDeclaration(freeze) || !ts.isStringLiteral(freeze.moduleSpecifier) || freeze.moduleSpecifier.text !== "../json.ts"
    || freeze.importClause?.isTypeOnly || freeze.importClause?.name || !freeze.importClause?.namedBindings
    || !ts.isNamedImports(freeze.importClause.namedBindings) || freeze.importClause.namedBindings.elements.length !== 1
    || freeze.importClause.namedBindings.elements[0]!.getText(file) !== "freezeDeep"
    || !ts.isImportDeclaration(type) || !ts.isStringLiteral(type.moduleSpecifier) || type.moduleSpecifier.text !== "./catalog-manifest-schema.ts"
    || !type.importClause?.isTypeOnly || type.importClause.name || !type.importClause.namedBindings
    || !ts.isNamedImports(type.importClause.namedBindings) || type.importClause.namedBindings.elements.length !== 1
    || type.importClause.namedBindings.elements[0]!.getText(file) !== "WebCatalogDefinition"
    || !ts.isVariableStatement(statement) || statement.modifiers?.length !== 1 || statement.modifiers[0]!.kind !== ts.SyntaxKind.ExportKeyword
    || !(statement.declarationList.flags & ts.NodeFlags.Const) || statement.declarationList.declarations.length !== 1) return fail("noncanonical declaration");
  const declaration = statement.declarationList.declarations[0]!, call = declaration.initializer;
  if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "WebCatalogManifest" || !call
    || !ts.isCallExpression(call) || !ts.isIdentifier(call.expression) || call.expression.text !== "freezeDeep" || call.arguments.length !== 1) return fail("opaque manifest initializer");
  const check = call.arguments[0]!;
  if (!ts.isSatisfiesExpression(check) || check.type.getText(file) !== "WebCatalogDefinition"
    || !ts.isAsExpression(check.expression) || check.expression.type.getText(file) !== "const") return fail("unchecked manifest");
  const value = literal(check.expression.expression);
  if (!Value.Check(WebCatalogManifestSchema, value)) fail("unknown or invalid registration fields");
  const manifest = value as WebCatalogDefinition, paths = new Set<string>(), bank = new Set<string>(), adapters = new Set<string>();
  for (const owner of Object.values(manifest.owners)) {
    if (owner.source !== posix.normalize(owner.source) || !owner.source.startsWith("src/svelte/") || paths.has(owner.source)) fail("duplicate or noncanonical owner source");
    paths.add(owner.source);
    for (const id of owner.bank ?? []) { if (bank.has(id)) fail("duplicate bank owner"); bank.add(id); }
    for (const [name, admission] of Object.entries(owner.adapters ?? {})) {
      if (adapters.has(name) || admission.props.some(key => admission.slots.includes(key))) fail("duplicate adapter admission");
      adapters.add(name);
    }
  }
  if (bank.size !== InteractionCatalog.entries.length || InteractionCatalog.entries.some(entry => !bank.has(entry.id))) fail("incomplete semantic bank");
  return freezeDeep(manifest);
}

export function webCatalogOwners(manifest: WebCatalogDefinition): ReadonlyMap<string, string> {
  return new Map(Object.values(manifest.owners).flatMap(owner => Object.keys(owner.adapters ?? {}).map(name => [name, owner.source])));
}
