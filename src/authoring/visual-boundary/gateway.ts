import { posix } from "node:path";
import ts from "typescript";
import { readWebCatalogManifest, webCatalogManifestPath, webCatalogOwners } from "../web-catalog/manifest.ts";

type Source = Readonly<{ path: string; source: string }>;
const gatewayPath = "src/svelte/adapter-catalog.ts";
type Fail = (reason: string) => never;
const file = (path: string, source: string) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

/** Gateways forward the declared implementation; they cannot wrap it, replace it,
 * add execution, import a stylesheet or grow a second catalog at runtime. */
export function assertCatalogGateway(sources: readonly Source[]): void {
  const gateway = sources.find(item => item.path === gatewayPath);
  if (!gateway) return; // Full build presence is checked independently.
  const fail: Fail = reason => { throw new Error(`CATALOG_GATEWAY: ${reason}`); };
  const manifest = sources.find(item => item.path === webCatalogManifestPath);
  if (!manifest) return fail("missing catalog manifest");
  const owners = webCatalogOwners(readWebCatalogManifest(manifest.source)), implementations = new Map<string, string>();
  const exports = new Set<string>();
  let adapterType: string | undefined;
  for (const statement of file(gatewayPath, gateway.source).statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && !statement.attributes) {
      const clause = statement.importClause, request = statement.moduleSpecifier.text;
      if (request === "./adapter-contract.ts" && clause?.isTypeOnly && !clause.name
        && clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        && clause.namedBindings.elements.length === 1 && !adapterType) {
        const entry = clause.namedBindings.elements[0]!;
        if ((entry.propertyName ?? entry.name).text !== "AdapterComponent") fail("foreign gateway contract");
        adapterType = entry.name.text;
      } else {
        const target = posix.join(posix.dirname(gatewayPath), request);
        if (!clause?.name || clause.isTypeOnly || clause.namedBindings || !request.startsWith("./")
          || ![...owners.values()].includes(target) || implementations.has(clause.name.text)) return fail("foreign gateway import");
        implementations.set(clause.name.text, target);
      }
    } else if (ts.isVariableStatement(statement) && statement.modifiers?.length === 1
      && statement.modifiers[0]!.kind === ts.SyntaxKind.ExportKeyword
      && statement.declarationList.flags & ts.NodeFlags.Const
      && statement.declarationList.declarations.length === 1) {
      const node = statement.declarationList.declarations[0]!;
      if (!ts.isIdentifier(node.name) || !node.initializer || !ts.isIdentifier(node.initializer)
        || !node.type || !ts.isTypeReferenceNode(node.type) || !ts.isIdentifier(node.type.typeName)
        || node.type.typeName.text !== adapterType || node.type.typeArguments?.length !== 1) return fail("opaque gateway export");
      const entry = node.type.typeArguments[0]!;
      if (!ts.isLiteralTypeNode(entry) || !ts.isStringLiteral(entry.literal) || entry.literal.text !== node.name.text
        || !owners.has(node.name.text) || exports.has(node.name.text)
        || implementations.get(node.initializer.text) !== owners.get(node.name.text)) return fail("substituted catalog owner");
      exports.add(node.name.text);
    } else fail("executable gateway extension");
  }
  if (!adapterType || exports.size !== owners.size) fail("incomplete gateway");
}
