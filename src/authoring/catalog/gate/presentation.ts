// Law: a piece tag, anywhere, passes only the plain props its contract declares; presentation stays inside the piece.
// Raises PRESENTATION_ESCAPE.
import ts from "typescript";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";
import type { ReadContract } from "../read-contract.ts";
import { parseable, type ContentRule, type GateContext } from "./context.ts";
import type { ParsedSvelte } from "./parse.ts";
import { exportedNames } from "./resolve-imports.ts";
import { violation, type Violation } from "./violation.ts";

const forbiddenNames = new Set(["class", "style", "role", "children", "elementProps", "viewportAttributes"]);
const skippedKeys = new Set(["loc", "name_loc", "comments", "leadingComments", "trailingComments", "metadata"]);

const field = (node: unknown, key: string): unknown => node && typeof node === "object" ? Reflect.get(node, key) : undefined;
const text = (node: unknown, key: string) => { const value = field(node, key); return typeof value === "string" ? value : ""; };
const nodes = (node: unknown, key: string): SyntaxNode[] => {
  const value = field(node, key);
  return Array.isArray(value) ? value.filter((item: unknown): item is SyntaxNode => typeof item === "object" && item !== null) : [];
};
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
const source = (parsed: ParsedSvelte, node: SyntaxNode) => parsed.source.slice(node.start ?? 0, node.end ?? 0);

/** The file that defines a binding imported into `path` under `local` (`member` of it, for a namespace). */
function importedDefinition(context: GateContext, path: string, local: string, member?: string): string | undefined {
  for (const item of context.imports(path)) {
    if (item.form !== "import" || item.typeOnly) continue;
    const binding = item.bindings.find(candidate => candidate.local === local);
    if (!binding) continue;
    if (binding.imported === "*") return member === undefined ? undefined : context.definition(item, member);
    return member === undefined ? context.definition(item, binding.imported) : undefined;
  }
  return undefined;
}

/** The file that defines the component a tag names (`Heading`, `H`, `Catalog.Heading`), through every barrel. */
export const componentDefinition = (context: GateContext, path: string, tag: string) => {
  const [local = "", member] = tag.split(".");
  return importedDefinition(context, path, local, member);
};

const isFreeze = (callee: ts.Expression) => ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)
  && callee.expression.text === "Object" && callee.name.text === "freeze";
const unwrapped = (node: ts.Expression): ts.Expression =>
  ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) ? unwrapped(node.expression)
    : ts.isCallExpression(node) && isFreeze(node.expression) && node.arguments[0] ? unwrapped(node.arguments[0]) : node;

/** `{@const R = table.key}` over an imported object literal of components (a registry): the file defining that entry. */
function registryEntry(context: GateContext, path: string, init: unknown): string | undefined {
  const object = text(field(init, "object"), "name"), property = field(init, "property");
  const key = field(init, "computed") ? field(property, "value") : text(property, "name");
  const table = object ? importedName(context, path, object) : undefined;
  if (!table || typeof key !== "string" || !parseable(table.file) || context.text(table.file) === undefined) return undefined;
  const parsed = context.parsed(table.file), local = exportedNames(parsed).get(table.name) ?? table.name;
  for (const { file } of parsed.scripts) for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== local || !declaration.initializer) continue;
      const literal = unwrapped(declaration.initializer);
      const entry = ts.isObjectLiteralExpression(literal) ? literal.properties.find(item => ts.isPropertyAssignment(item)
        && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === key) : undefined;
      if (entry && ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.initializer)) return importedDefinition(context, table.file, entry.initializer.text);
    }
  }
  return undefined;
}

function importedName(context: GateContext, path: string, local: string) {
  for (const item of context.imports(path)) {
    const binding = item.form === "import" && !item.typeOnly ? item.bindings.find(candidate => candidate.local === local) : undefined;
    const file = binding && binding.imported !== "*" ? context.definition(item, binding.imported) : undefined;
    if (binding && file && !file.endsWith(".svelte")) return { file, name: binding.imported };
  }
  return undefined;
}

type Scope = ReadonlyMap<string, string | undefined>;
/** The file a tag mounts: a `{@const}` in scope wins over an import of the same name. */
function mounted(context: GateContext, path: string, name: string, scope: Scope): string | undefined {
  const local = name.split(".")[0] ?? "";
  if (!scope.has(local)) return componentDefinition(context, path, name);
  return name === local ? scope.get(local) : undefined;
}
/** Every Component tag with the file it mounts; `{@const}` names shadow imports inside their block. */
function componentTags(context: GateContext, path: string, value: unknown, scope: Scope, found: { tag: SyntaxNode; file: string | undefined }[]) {
  if (Array.isArray(value)) { const items: readonly unknown[] = value; for (const item of items) componentTags(context, path, item, scope, found); return; }
  if (!isNode(value)) return;
  let inner = scope;
  const children = nodes(value, "nodes"), consts = children.filter(child => child.type === "ConstTag");
  if (consts.length) {
    const next = new Map(scope);
    for (const constant of consts) for (const declarator of nodes(field(constant, "declaration"), "declarations")) {
      next.set(text(field(declarator, "id"), "name"), registryEntry(context, path, field(declarator, "init")));
    }
    inner = next;
  }
  if (field(value, "type") === "Component") found.push({ tag: value, file: mounted(context, path, text(value, "name"), inner) });
  for (const [key, child] of Object.entries(value)) if (!skippedKeys.has(key)) componentTags(context, path, child, inner, found);
}

/** How an attribute reads in a message, or undefined when it is a plain attribute that only the contract can judge. */
function forbiddenAttribute(parsed: ParsedSvelte, attribute: SyntaxNode): string | undefined {
  const name = text(attribute, "name");
  switch (attribute.type) {
    case "Attribute": return forbiddenNames.has(name) || name.startsWith("data-") ? name : undefined;
    case "SpreadAttribute": case "AttachTag": return source(parsed, attribute);
    case "StyleDirective": return `style:${name}`;
    case "ClassDirective": return `class:${name}`;
    case "UseDirective": return `use:${name}`;
    case "AnimateDirective": return `animate:${name}`;
    case "BindDirective": return `bind:${name}`;
    case "OnDirective": return `on:${name}`;
    case "LetDirective": return `let:${name}`;
    case "TransitionDirective": return `${attribute.intro && attribute.outro ? "transition" : attribute.intro ? "in" : "out"}:${name}`;
    default: return attribute.type ?? "attribute";
  }
}

const declares = (contract: ReadContract, name: string) => contract.closed
  && (name in contract.props || name in contract.events || name.startsWith("on") && name.slice(2) in contract.events);

function checkTag(context: GateContext, path: string, parsed: ParsedSvelte, tag: SyntaxNode, id: string): Violation[] {
  const found: Violation[] = [], line = parsed.line(tag.start ?? 0), name = text(tag, "name"), contract = context.contract(id);
  const escape = (what: string) => found.push(violation("PRESENTATION_ESCAPE", path, line, `<${name}> ${what}`));
  const forbid = (attribute: string) => escape(`passes ${attribute}: a piece takes only the plain props its contract declares; contract: ${id}`);
  const owner = context.owners.of(path), skipSpreads = owner?.kind === "piece" && owner.dispatch;
  const undeclared: string[] = [];
  for (const attribute of nodes(tag, "attributes")) {
    if (attribute.type === "SpreadAttribute" && skipSpreads) continue;
    const forbidden = forbiddenAttribute(parsed, attribute);
    if (forbidden !== undefined) { forbid(forbidden); continue; }
    const attributeName = text(attribute, "name");
    if (contract?.closed && declares(contract, attributeName)) continue;
    if (contract?.closed || attributeName.startsWith("aria-")) escape(`passes ${attributeName}, which the contract of ${id} does not declare`);
    else undeclared.push(attributeName);
  }
  if (undeclared.length) escape(`passes ${undeclared.join(", ")}: the contract of ${id} declares no props yet`);
  checkChildren(context, tag, id, escape, forbid);
  return found;
}

/** Element children are content the piece did not declare; only snippets for the piece's declared slots pass. */
function checkChildren(context: GateContext, tag: SyntaxNode, id: string, escape: (what: string) => void, forbid: (attribute: string) => void) {
  const declaration = context.owners.declaration(id)?.declaration;
  const slots = declaration && declaration.kind !== "mechanism" ? Object.keys(declaration.slots ?? {}) : [];
  let content = false;
  for (const child of nodes(field(tag, "fragment"), "nodes")) {
    if (child.type === "Comment" || child.type === "Text" && text(child, "data").trim() === "") continue;
    if (child.type !== "SnippetBlock") { content = true; continue; }
    const snippet = text(field(child, "expression"), "name");
    if (snippet === "children") forbid("children");
    else if (!slots.includes(snippet)) escape(`receives snippet ${snippet}, which ${id} declares no slot for`);
  }
  if (content) escape(`receives child content, which ${id} declares no slot for`);
}

export const ruleE: ContentRule = context => {
  const found: Violation[] = [];
  for (const path of context.paths) {
    if (!path.endsWith(".svelte")) continue;
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte") continue;
    const tags: { tag: SyntaxNode; file: string | undefined }[] = [];
    componentTags(context, path, parsed.fragment, new Map(), tags);
    for (const { tag, file } of tags) {
      const id = file === undefined ? undefined : context.owners.pieceOfEntry(file);
      if (id !== undefined) found.push(...checkTag(context, path, parsed, tag, id));
    }
  }
  return found;
};
