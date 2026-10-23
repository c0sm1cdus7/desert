import { posix } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { inspectVisualSource } from "./inspect.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import { assertSealedAdapter, sealedAdapterPaths } from "./adapter.ts";
import { assertCanonicalToolbarOwnership } from "./toolbar.ts";
import { assertNoAdapterGlobals } from "./adapter-globals.ts";
import { assertBankDispatcher } from "./dispatch.ts";
import { closedCompositionOwners, assertPrivateCompositionSlots } from "./composition.ts";
import { assertCanonicalBootstrap } from "./bootstrap.ts";
import { requestPath } from "./source-request.ts";
import { assertCatalogGateway } from "./gateway.ts";
import { catalogClosureSources } from "../../svelte/catalog-admissions.ts";
import { assertFiniteCatalogInputs } from "./finite-inputs.ts";

/** Migrated families, not duplicated prop contracts or a legacy exemption list.
 * Semantic keys remain defined by their component/schema; this gate bans escapes.
 */
export const closedComponents = catalogClosureSources("closed");
const closedAdapters = new Set(sealedAdapterPaths);
const rendererRules = new Set(["RENDERER_DOM", "RENDERER_TEXT", "RENDERER_CSS", "RENDERER_DOM_ACCESS", "PRIVATE_VISUAL_IMPORT", "DYNAMIC_VISUAL_IMPORT"]);
type Source = Readonly<{ path: string; source: string }>;

function importedComponents(path: string, script: string): Map<string, string> {
  const imports = new Map<string, string>();
  const file = ts.createSourceFile(path, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = requestPath(statement.moduleSpecifier.text), local = statement.importClause?.name?.text;
    const target = specifier.startsWith(".") ? posix.normalize(posix.join(posix.dirname(path), specifier))
      : specifier.startsWith("@desert/") ? `src/${specifier.slice(8)}` : undefined;
    if (local && target) imports.set(local, target);
  }
  return imports;
}

/** Non-baseline source gate: a debt snapshot cannot authorize reopening these APIs.
 * Direct consumer identities are resolved here. The real build additionally
 * checks sealed adapters' nonvisual dependency graph; private-owner closure is
 * still separately unqualified.
 */
export function assertClosedVisualBoundaries(sources: readonly Source[]): void {
  assertCatalogGateway(sources);
  assertCanonicalBootstrap(sources);
  assertCanonicalToolbarOwnership(sources);
  assertBankDispatcher(sources);
  assertFiniteCatalogInputs(sources);
  for (const { path, source } of sources) {
    if (!path.endsWith(".svelte")) continue;
    const fail = (reason: string): never => { throw new Error(`CLOSED_VISUAL_BOUNDARY: ${path}: ${reason}`); };
    const evidence = inspectVisualSource(path, source);
    if (closedAdapters.has(path)) for (const item of evidence.findings) if (rendererRules.has(item.code)) fail(item.code);
    if (closedComponents.has(path) || closedCompositionOwners.has(path)) for (const item of evidence.findings) {
      if (["OPEN_COMPONENT_CONTRACT", "RAW_HTML", "UNINSPECTABLE_SOURCE"].includes(item.code)) fail(item.code);
    }
    const tree = parse(source, { modern: true });
    if (closedCompositionOwners.has(path)) assertPrivateCompositionSlots(tree.fragment as unknown as SyntaxNode, fail);
    const script = tree.instance?.content as { start: number; end: number } | undefined;
    if (closedAdapters.has(path)) {
      assertSealedAdapter(path, [tree.instance, tree.module].flatMap(block => {
        const content = block?.content as { start: number; end: number } | undefined;
        return content ? [source.slice(content.start, content.end)] : [];
      }), tree.fragment as unknown as SyntaxNode, fail);
      assertNoAdapterGlobals(path, source, fail);
    }
    const imports = importedComponents(path, script ? source.slice(script.start, script.end) : "");
    walk(tree.fragment, node => {
      if (closedComponents.has(path) && ["SpreadAttribute", "RenderTag", "SnippetBlock"].includes(node.type ?? "")) fail(`open rendering: ${node.type}`);
      if (node.type !== "Component") return;
      const target = imports.get(String(node.name));
      if (!target || !closedComponents.has(target) && !closedCompositionOwners.has(target)) return;
      for (const attribute of node.attributes as SyntaxNode[]) {
        if (attribute.type !== "Attribute" || /^(class|style|role|elementProps|viewportAttributes|children|data-.*)$/.test(String(attribute.name))) {
          fail(`presentation escape into ${target}: ${attribute.name ?? attribute.type}`);
        }
      }
      const children = (node.fragment as { nodes: SyntaxNode[] }).nodes;
      if (children.some(child => child.type !== "Comment" && !(child.type === "Text" && !String(child.data).trim()))) fail(`render children: ${target}`);
    });
  }
}
