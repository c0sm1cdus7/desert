import { posix } from "node:path";
import ts from "typescript";
import { AdapterCatalog, type AdapterEntry } from "../../svelte/adapter-contract.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import { requestPath } from "./source-request.ts";

const gateway = "src/svelte/adapter-catalog.ts";
export const sealedAdapterPaths = Object.freeze([
  "src/svelte/catalog/renderer/facts/Facts.svelte",
  "src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte",
  "src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte",
  "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", "src/svelte/catalog/renderer/instance-frame/InstanceFrame.svelte",
  "src/svelte/catalog/renderer/view-item/ViewItem.svelte", "src/svelte/catalog/renderer/view-content/ViewContent.svelte",
  "src/svelte/catalog/renderer/panel/Panel.svelte", "src/svelte/catalog/renderer/failure-dialog/FailureDialog.svelte",
  "src/svelte/catalog/renderer/control-renderer/ControlRenderer.svelte", "src/svelte/catalog/renderer/public-catalog-bank-specimen/PublicCatalogBankSpecimen.svelte",
  "src/svelte/catalog/renderer/media-content/MediaContent.svelte", "src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte",
  "src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte", "src/svelte/catalog/renderer/workspace/Workspace.svelte", "src/svelte/catalog/renderer/view-product/ViewProduct.svelte",
]);
export const requiredAdapterSources = Object.freeze([
  ...sealedAdapterPaths, gateway, "src/svelte/adapter-contract.ts",
]);

/** Partial source fixtures can exercise the AST gate, but a real build must not
 * silently stop enforcing a sealed adapter because its source was removed.
 * This does not qualify the remaining, unsealed renderer import graph.
 */
export function assertCompleteAdapterSources(sources: readonly { path: string }[]): void {
  const found = new Set(sources.map(source => source.path));
  if (found.size !== sources.length) throw new Error("CLOSED_VISUAL_BOUNDARY: duplicate source identity");
  for (const path of requiredAdapterSources) if (!found.has(path)) {
    throw new Error(`CLOSED_VISUAL_BOUNDARY: missing required source: ${path}`);
  }
}
const target = (path: string, specifier: string) => specifier.startsWith(".")
  ? posix.normalize(posix.join(posix.dirname(path), specifier))
  : specifier.startsWith("@desert/") ? `src/${specifier.slice(8)}` : specifier;
type Fail = (reason: string) => never;

/** Named imports preserve component identity; a local alias of an imported name
 * is fine, but arbitrary variables, namespace properties and shadowing are not.
 */
function admittedImports(path: string, scripts: readonly string[], fail: Fail) {
  const admitted = new Map<string, AdapterEntry>();
  const files = scripts.map(script => ts.createSourceFile(path, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
  for (const file of files) for (const node of file.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) continue;
    const from = target(path, node.moduleSpecifier.text);
    if (from !== gateway) {
      if (requestPath(from).endsWith(".svelte")) fail("private component import");
      continue;
    }
    const bindings = node.importClause?.namedBindings;
    if (node.importClause?.name || !bindings || !ts.isNamedImports(bindings)) fail("opaque catalog import");
    for (const item of bindings.elements) {
      if (item.isTypeOnly) continue;
      const name = item.propertyName?.text ?? item.name.text;
      if (!Object.hasOwn(AdapterCatalog, name)) fail("unknown catalog entry");
      admitted.set(item.name.text, name as AdapterEntry);
    }
  }
  const checkName = (node: ts.BindingName) => {
    if (ts.isIdentifier(node)) { if (admitted.has(node.text)) fail("shadowed catalog entry"); }
    else for (const item of node.elements) if (!ts.isOmittedExpression(item)) checkName(item.name);
  };
  for (const file of files) {
    function visit(node: ts.Node): void {
      if (ts.isVariableDeclaration(node) || ts.isParameter(node)) checkName(node.name);
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node)
        || ts.isClassExpression(node)) && node.name) checkName(node.name);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || ts.isIdentifier(node.expression) && ["require", "eval", "Function"].includes(node.expression.text))) fail("opaque adapter execution");
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return admitted;
}

export function bindingNames(pattern: SyntaxNode | undefined): string[] {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [String(pattern.name)];
  if (pattern.type === "AssignmentPattern") return bindingNames(pattern.left as SyntaxNode);
  if (pattern.type === "RestElement") return bindingNames(pattern.argument as SyntaxNode);
  if (pattern.type === "ArrayPattern") return (pattern.elements as SyntaxNode[]).flatMap(bindingNames);
  if (pattern.type === "ObjectPattern") return (pattern.properties as SyntaxNode[])
    .flatMap(item => bindingNames((item.type === "RestElement" ? item.argument : item.value) as SyntaxNode));
  return [];
}

export function assertSealedAdapter(path: string, scripts: readonly string[], fragment: SyntaxNode, fail: Fail): void {
  const admitted = admittedImports(path, scripts, fail);
  walk(fragment, (node, parent) => {
    if (["HtmlTag", "RenderTag", "SnippetBlock"].includes(node.type ?? "") || node.type?.startsWith("Svelte")) fail("opaque rendering");
    if (node.type === "ImportExpression" || node.type === "CallExpression"
      && ["require", "eval", "Function"].includes(String((node.callee as SyntaxNode | undefined)?.name))) fail("opaque adapter execution");
    if (node.type === "ExpressionTag" && parent?.type === "Fragment") fail("adapter text rendering");
    const bindings = node.type === "EachBlock" ? [...bindingNames(node.context as SyntaxNode), ...(node.index ? [String(node.index)] : [])]
      : node.type === "AwaitBlock" ? [...bindingNames(node.value as SyntaxNode), ...bindingNames(node.error as SyntaxNode)]
      : node.type === "VariableDeclarator" ? bindingNames(node.id as SyntaxNode) : [];
    if (bindings.some(name => admitted.has(name))) fail("shadowed catalog entry");
    if (node.type !== "Component") return;
    const entry = admitted.get(String(node.name));
    if (!entry) fail("component outside adapter catalog");
    const contract = AdapterCatalog[entry];
    for (const attribute of node.attributes as SyntaxNode[]) {
      if (attribute.type === "BindDirective" && attribute.name === "this" && contract.instance.length) continue;
      if (attribute.type !== "Attribute" || !(contract.props as readonly string[]).includes(String(attribute.name))) {
        fail(`unsupported ${entry} input: ${attribute.name ?? attribute.type}`);
      }
    }
    const children = (node.fragment as { nodes: SyntaxNode[] }).nodes;
    if (!contract.slots.length && children.some(child => child.type !== "Comment"
      && !(child.type === "Text" && !String(child.data).trim()))) fail(`unsupported ${entry} content`);
  });
}
