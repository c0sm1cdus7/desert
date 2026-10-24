import { posix } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { catalogClosureSources } from "../../svelte/catalog-admissions.ts";
import { requestPath } from "./source-request.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import { readContract } from "../catalog/read-contract.ts";

const visualInput = /^(class|style|role|elementProps|viewportAttributes|data-.*)$/;
const owners = catalogClosureSources("finite-inputs");
const resolveImport = (path: string, request: string) => {
  const value = requestPath(request);
  return value.startsWith(".") ? posix.normalize(posix.join(posix.dirname(path), value))
    : value.startsWith("@desert/") ? `src/${value.slice(8)}` : value;
};

/** The prop names of a piece's closed contract (`<folder>/<id>.contract.ts` beside the entry), or undefined when it is a stub. */
function closedContractProps(sources: readonly { path: string; source: string }[], entry: string, id: string): (string | undefined)[] | undefined {
  const path = posix.join(posix.dirname(entry), `${id}.contract.ts`), source = sources.find(item => item.path === path)?.source;
  if (source === undefined) return undefined;
  const contract = readContract(path, source);
  return contract.closed ? Object.keys(contract.props) : undefined;
}

/** Finite native-input boundaries, not slot/dependency closure. The component's
 * actual literal prop type is authoritative; no second list of semantic props.
 * All supplied Svelte callers are checked, including other catalog owners. */
export function assertFiniteCatalogInputs(sources: readonly { path: string; source: string }[]): void {
  for (const {path,source} of sources) {
    if (!path.endsWith(".svelte")) continue;
    const fail = (reason: string): never => { throw new Error(`FINITE_CATALOG_INPUT: ${path}: ${reason}`); };
    const tree = parse(source, {modern:true}), imports = new Set<string>();
    const scripts: ts.SourceFile[]=[];
    for (const block of [tree.instance,tree.module]) {
      const range = block?.content as {start:number;end:number} | undefined;
      if (!range) continue;
      const file = ts.createSourceFile(path, source.slice(range.start,range.end), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      scripts.push(file);
      for (const statement of file.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
        && owners.has(resolveImport(path,statement.moduleSpecifier.text))) {
        const clause=statement.importClause;
        if (!clause?.name || clause.namedBindings) return fail("finite owner requires a direct default component import");
        imports.add(clause.name.text);
      }
    }
    for (const file of scripts) {
      function visit(node: ts.Node): void {
        if (owners.has(path)) {
          if (ts.isIdentifier(node) && (/^HTML\w*Attributes$/.test(node.text) || node.text === "ComponentProps")) fail("native attribute contract");
          if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
            && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "$props") {
            if (!ts.isObjectBindingPattern(node.name)) return fail("props must have a finite literal contract");
            // Ported to the catalog: `CatalogProps<"<id>">` over the piece's closed contract is the finite literal contract.
            const catalogId = node.type && ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName)
              && node.type.typeName.text === "CatalogProps" && node.type.typeArguments?.length === 1
              && ts.isLiteralTypeNode(node.type.typeArguments[0]!) && ts.isStringLiteral(node.type.typeArguments[0].literal)
              ? node.type.typeArguments[0].literal.text : undefined;
            const names = catalogId !== undefined ? closedContractProps(sources, path, catalogId)
              : node.type && ts.isTypeLiteralNode(node.type) ? node.type.members.map(prop => ts.isPropertySignature(prop) && prop.name
                && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : undefined) : undefined;
            if (!names) return fail("props must have a finite literal contract");
            for (const name of names) {
              if (name === undefined) return fail("open prop signature");
              if (visualInput.test(name)) fail(`visual input ${name}`);
            }
            if (node.name.elements.some(binding => binding.dotDotDotToken)) fail("native rest forwarding");
          }
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
          && node.arguments.some(argument => ts.isStringLiteral(argument) && owners.has(resolveImport(path,argument.text)))) fail("opaque finite owner import");
        if (ts.isIdentifier(node) && imports.has(node.text) && !ts.isImportClause(node.parent)) fail("opaque finite owner alias or use");
        ts.forEachChild(node,visit);
      }
      visit(file);
    }
    walk(tree.fragment, node => {
      if (node.type === "Identifier" && imports.has(String(node.name))) fail("opaque finite owner template alias or use");
      if (owners.has(path) && ["SpreadAttribute","HtmlTag","SvelteComponent","SvelteElement"].includes(node.type ?? "")) fail(`open rendering ${node.type}`);
      if (node.type !== "Component" || !imports.has(String(node.name))) return;
      for (const attribute of node.attributes as SyntaxNode[]) {
        if (!(attribute.type === "Attribute" || attribute.type === "BindDirective") || visualInput.test(String(attribute.name))) {
          fail(`caller visual input ${attribute.name ?? attribute.type}`);
        }
      }
    });
  }
}
