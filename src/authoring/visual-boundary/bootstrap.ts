import { parse } from "svelte/compiler";
import ts from "typescript";
import type { SyntaxNode } from "./walk.ts";

export const bootstrapPath = "src/build/svelte/template/src/routes/+layout.svelte";
export const requiredBootstrapSources = Object.freeze([bootstrapPath]);
type Source = Readonly<{ path: string; source: string }>;

export function assertCompleteBootstrapSources(sources: readonly Source[]): void {
  for (const path of requiredBootstrapSources) if (!sources.some(source => source.path === path)) {
    throw new Error(`CLOSED_VISUAL_BOOTSTRAP: missing source: ${path}`);
  }
}

/** The host imports one existing theme and renders exactly SvelteKit's child.
 * This framework-owned slot does not authorize product/caller rendering APIs.
 */
export function assertCanonicalBootstrap(sources: readonly Source[]): void {
  const source = sources.find(item => item.path === bootstrapPath)?.source;
  if (source === undefined) return; // Complete presence is required by the build guard.
  const fail = (reason: string): never => { throw new Error(`CLOSED_VISUAL_BOOTSTRAP: ${reason}`); };
  const tree = parse(source, { modern: true });
  if (!tree.instance || tree.module || tree.css || tree.options) fail("foreign bootstrap owner");
  const block = tree.instance!.content as unknown as { start: number; end: number };
  const file = ts.createSourceFile(bootstrapPath, source.slice(block.start, block.end), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let theme = false, snippet: string | undefined, props: ts.VariableDeclaration | undefined;
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && !statement.attributes) {
      const from = statement.moduleSpecifier.text, clause = statement.importClause;
      if (from === "@desert/svelte/theme.css" && !clause && !theme) theme = true;
      else if (from === "svelte" && clause?.isTypeOnly && !clause.name && clause.namedBindings
        && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length === 1 && !snippet) {
        const item = clause.namedBindings.elements[0]!;
        if ((item.propertyName ?? item.name).text !== "Snippet") fail("foreign framework type");
        snippet = item.name.text;
      } else fail("foreign bootstrap import");
    } else if (ts.isVariableStatement(statement) && !statement.modifiers && statement.declarationList.declarations.length === 1 && !props) {
      props = statement.declarationList.declarations[0]!;
    } else fail("executable bootstrap extension");
  }
  if (!theme || !snippet || !props || !ts.isObjectBindingPattern(props.name) || props.name.elements.length !== 1) fail("missing canonical bootstrap");
  const binding = props!.name as ts.ObjectBindingPattern, child = binding.elements[0]!;
  if (!ts.isIdentifier(child.name) || child.name.text !== "children" || child.initializer || child.dotDotDotToken || child.propertyName) fail("foreign bootstrap prop");
  const type = props!.type, init = props!.initializer;
  if (!type || !ts.isTypeLiteralNode(type) || type.members.length !== 1) fail("open bootstrap props");
  const member = (type as ts.TypeLiteralNode).members[0]!;
  if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name) || member.name.text !== "children" || member.questionToken
    || !member.type || !ts.isTypeReferenceNode(member.type) || member.type.typeName.getText(file) !== snippet || member.type.typeArguments) fail("foreign child contract");
  if (!init || !ts.isCallExpression(init) || !ts.isIdentifier(init.expression) || init.expression.text !== "$props"
    || init.arguments.length || init.typeArguments) fail("foreign bootstrap initialization");
  const nodes = tree.fragment.nodes.filter(node => node.type !== "Comment" && !(node.type === "Text" && !node.data.trim()));
  if (nodes.length !== 1 || nodes[0]!.type !== "RenderTag") fail("bootstrap draws or replaces route");
  const call = (nodes[0] as unknown as SyntaxNode).expression as SyntaxNode;
  const callee = call.callee as SyntaxNode;
  if (call.type !== "CallExpression" || callee.type !== "Identifier" || callee.name !== "children"
    || (call.arguments as unknown[]).length) fail("foreign bootstrap render");
}
