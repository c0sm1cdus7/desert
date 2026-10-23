import { posix } from "node:path";
import ts from "typescript";
import type { parse } from "svelte/compiler";
import { walk, type SyntaxNode as Node } from "./walk.ts";

type Source = Readonly<{ path: string; source: string }>;
type Parsed = Source & { tree: ReturnType<typeof parse> };
const provider = "src/svelte/vendor/components/ui/sidebar/sidebar-provider.svelte";
const entry = "src/svelte/vendor/components/ui/sidebar/index.js";
const constants = "src/svelte/vendor/components/ui/sidebar/constants.ts";
const workspace = "src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte";
const nodes = (value: unknown): Node[] => Array.isArray(value) ? value as Node[] : [];
const resolve = (from: string, value: string) => value.startsWith(".") ? posix.normalize(posix.join(posix.dirname(from), value))
  : value.startsWith("@desert/") ? `src/${value.slice(8)}` : value;

/** The current workspace has one measured Sidebar width bridge. This admits
 * that exact input, not Sidebar's unrelated open native-attribute API. */
export function toolbarPlacement(sources: readonly Source[], parsed: readonly Parsed[]) {
  const permittedInline = new Set<Node>(), values: string[] = [];
  function fail(reason: string): never { throw new Error(`TOOLBAR_OWNERSHIP: sidebar placement: ${reason}`); }
  const owner = parsed.find(item => item.path === provider), constant = sources.find(item => item.path === constants);
  if (!owner || !constant) fail("missing canonical width owner");
  const script = ts.createSourceFile(constants, constant.source, ts.ScriptTarget.Latest, true);
  walk(owner.tree.fragment, node => {
    if (node.type !== "RegularElement") return;
    const attributes = nodes(node.attributes);
    if (!attributes.some(attribute => attribute.type === "Attribute" && attribute.name === "data-slot"
      && nodes(attribute.value).some(value => value.type === "Text" && value.data === "sidebar-wrapper"))) return;
    const style = attributes.find(attribute => attribute.type === "Attribute" && attribute.name === "style");
    const parts = nodes(style?.value);
    if (!style || parts[0]?.type !== "Text" || String(parts[0].data).trim() !== "--sidebar-width:"
      || parts[1]?.type !== "ExpressionTag" || (parts[1].expression as Node).type !== "Identifier"
      || (parts[1].expression as Node).name !== "SIDEBAR_WIDTH"
      || parts.slice(2).some(part => part.type === "Text" && /--sidebar-width\s*:/.test(String(part.data)))) fail("invalid native width binding");
    permittedInline.add(style);
  });
  if (permittedInline.size !== 1) fail("width needs one native writer");
  function inspectConstant(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "SIDEBAR_WIDTH") {
      if (!node.initializer || !ts.isStringLiteral(node.initializer)) fail("width default must remain a literal");
      values.push(node.initializer.text);
    }
    ts.forEachChild(node, inspectConstant);
  }
  inspectConstant(script);
  if (values.length !== 1) fail("width needs one default");
  for (const item of parsed) {
    const components = new Set<string>();
    for (const block of [item.tree.instance, item.tree.module]) {
      const content = block?.content as { start: number; end: number } | undefined;
      if (!content) continue;
      const script = ts.createSourceFile(item.path, item.source.slice(content.start, content.end), ts.ScriptTarget.Latest, true);
      for (const statement of script.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const target = resolve(item.path, statement.moduleSpecifier.text), clause = statement.importClause;
        if (target === provider && clause?.name) components.add(clause.name.text);
        if (target !== entry || !clause?.namedBindings) continue;
        if (ts.isNamespaceImport(clause.namedBindings)) components.add(`${clause.namedBindings.name.text}.Provider`);
        else for (const binding of clause.namedBindings.elements) if ((binding.propertyName ?? binding.name).text === "Provider") components.add(binding.name.text);
      }
    }
    walk(item.tree.fragment, node => {
      if (node.type !== "Component" || !components.has(String(node.name))) return;
      const attributes = nodes(node.attributes);
      if (attributes.some(attribute => attribute.type === "SpreadAttribute" || attribute.type === "StyleDirective")) fail("caller cannot replace measured placement inputs");
      const style = attributes.find(attribute => attribute.type === "Attribute" && attribute.name === "style");
      if (!style) return;
      const parts = nodes(style.value);
      const text = parts.every(part => part.type === "Text") ? parts.map(part => String(part.data)).join("") : "";
      const binding = /^\s*--sidebar-width\s*:\s*var\(\s*(--[\w-]+)\s*\)\s*;?\s*$/.exec(text);
      if (item.path !== workspace || !binding) fail("caller must use its canonical profile width reference");
      values.push(`var(${binding[1]})`);
      permittedInline.add(style);
    });
  }
  return { owner: provider, values, permittedInline };
}
