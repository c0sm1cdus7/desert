// Law: a piece tag, anywhere, passes only the plain props its contract declares; presentation stays inside the piece.
// Raises PRESENTATION_ESCAPE. E owns every attribute and child-content report on a piece tag, including a dispatcher's
// `{@const R = table[key]}` lookup (D2 owns only the dispatcher's grammar and its spreads). A computed lookup mounts one of
// the table's pieces: the forbidden list, aria attributes and child content are judged now; judging its plain props needs
// the entries' closed contracts (a prop passes when every entry declares it) and waits for them.
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
const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
const nodes = (node: unknown, key: string): SyntaxNode[] => { const value = field(node, key); return Array.isArray(value) ? value.filter(isNode) : []; };
const source = (parsed: ParsedSvelte, node: SyntaxNode) => parsed.source.slice(node.start ?? 0, node.end ?? 0);

/** The value import that binds `local` in `path`, with its binding. */
function importOf(context: GateContext, path: string, local: string) {
  for (const item of context.imports(path)) {
    const binding = item.form === "import" && !item.typeOnly ? item.bindings.find(candidate => candidate.local === local) : undefined;
    if (binding) return { item, binding };
  }
  return undefined;
}

/** The file that defines a binding imported into `path` under `local` (`member` of it, for a namespace). */
function importedDefinition(context: GateContext, path: string, local: string, member?: string): string | undefined {
  const found = importOf(context, path, local);
  if (!found) return undefined;
  if (found.binding.imported === "*") return member === undefined ? undefined : context.definition(found.item, member);
  return member === undefined ? context.definition(found.item, found.binding.imported) : undefined;
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

/** `table.key` over an imported object literal of components (a registry): the file defining that entry. */
function registryEntry(context: GateContext, path: string, object: string, key: string): string | undefined {
  const table = importedName(context, path, object);
  if (!table || !parseable(table.file) || context.text(table.file) === undefined) return undefined;
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
  const found = importOf(context, path, local), name = found?.binding.imported;
  const file = found && name !== "*" && name !== undefined ? context.definition(found.item, name) : undefined;
  return name !== undefined && file && !file.endsWith(".svelte") ? { file, name } : undefined;
}

/** What a tag mounts: one piece's entry file, or one of the pieces of an imported component table (a computed lookup). */
type Mount = Readonly<{ file: string } | { table: string }> | undefined;
type Scope = ReadonlyMap<string, Mount>;
const fileMount = (file: string | undefined): Mount => file === undefined ? undefined : { file };

/** An imported binding that is not itself a component: a table of components, or a namespace of them. */
function isComponentTable(context: GateContext, path: string, local: string): boolean {
  const found = importOf(context, path, local);
  return found !== undefined && (found.binding.imported === "*" || !(context.definition(found.item, found.binding.imported) ?? "").endsWith(".svelte"));
}

/** What `{@const Local = init}` binds: an alias of a tag in scope or imported, a namespace member, or a table lookup. */
function constMount(context: GateContext, path: string, init: unknown, scope: Scope): Mount {
  if (field(init, "type") === "Identifier") return mounted(context, path, text(init, "name"), scope);
  const object = field(init, "object"), property = field(init, "property");
  if (field(init, "type") !== "MemberExpression" || field(object, "type") !== "Identifier") return undefined;
  const table = text(object, "name"), computed = field(init, "computed") === true, literal = field(property, "value");
  if (scope.has(table) || !isComponentTable(context, path, table)) return undefined;
  const key = computed ? typeof literal === "string" ? literal : undefined : text(property, "name");
  if (key === undefined) return { table };
  return fileMount(componentDefinition(context, path, `${table}.${key}`) ?? registryEntry(context, path, table, key));
}

/** What a tag mounts: a `{@const}` in scope wins over an import of the same name. */
function mounted(context: GateContext, path: string, name: string, scope: Scope): Mount {
  const local = name.split(".")[0] ?? "";
  if (!scope.has(local)) return fileMount(componentDefinition(context, path, name));
  return name === local ? scope.get(local) : undefined;
}
/** Every Component tag with what it mounts; `{@const}` names shadow imports inside their block. */
function componentTags(context: GateContext, path: string, value: unknown, scope: Scope, found: { tag: SyntaxNode; mount: Mount }[]) {
  if (Array.isArray(value)) { const items: readonly unknown[] = value; for (const item of items) componentTags(context, path, item, scope, found); return; }
  if (!isNode(value)) return;
  let inner = scope;
  const children = nodes(value, "nodes"), consts = children.filter(child => child.type === "ConstTag");
  if (consts.length) {
    const next = new Map(scope);
    for (const constant of consts) for (const declarator of nodes(field(constant, "declaration"), "declarations")) {
      next.set(text(field(declarator, "id"), "name"), constMount(context, path, field(declarator, "init"), next));
    }
    inner = next;
  }
  if (field(value, "type") === "Component") found.push({ tag: value, mount: mounted(context, path, text(value, "name"), inner) });
  for (const [key, child] of Object.entries(value)) if (!skippedKeys.has(key)) componentTags(context, path, child, inner, found);
}

/** How an attribute reads in a message, or undefined when it is a plain attribute that only the contract can judge. */
export function forbiddenAttribute(parsed: ParsedSvelte, attribute: SyntaxNode): string | undefined {
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

/** The piece(s) a tag mounts, as the law judges them: `label` names them, `plain` says whether plain props are judged now. */
type Target = Readonly<{ label: string; contract: ReadContract | undefined; slots: readonly string[]; plain: boolean }>;
function pieceTarget(context: GateContext, id: string): Target {
  const declaration = context.owners.declaration(id)?.declaration;
  const slots = declaration && declaration.kind !== "mechanism" ? Object.keys(declaration.slots ?? {}) : [];
  return { label: id, contract: context.contract(id), slots, plain: true };
}
const tableTarget = (table: string): Target => ({ label: `an entry of ${table}`, contract: undefined, slots: [], plain: false });

function checkTag(path: string, parsed: ParsedSvelte, tag: SyntaxNode, target: Target, skipSpreads: boolean): Violation[] {
  const found: Violation[] = [], line = parsed.line(tag.start ?? 0), name = text(tag, "name"), { label: id, contract } = target;
  const escape = (what: string) => found.push(violation("PRESENTATION_ESCAPE", path, line, `<${name}> ${what}`));
  const forbid = (attribute: string) => escape(`passes ${attribute}: a piece takes only the plain props its contract declares; contract: ${id}`);
  const undeclared: string[] = [];
  for (const attribute of nodes(tag, "attributes")) {
    if (attribute.type === "SpreadAttribute" && skipSpreads) continue;
    const forbidden = forbiddenAttribute(parsed, attribute);
    if (forbidden !== undefined) { forbid(forbidden); continue; }
    const attributeName = text(attribute, "name");
    if (contract?.closed && declares(contract, attributeName)) continue;
    if (contract?.closed || attributeName.startsWith("aria-")) escape(`passes ${attributeName}, which the contract of ${id} does not declare`);
    else if (target.plain) undeclared.push(attributeName);
  }
  if (undeclared.length) escape(`passes ${undeclared.join(", ")}: the contract of ${id} declares no props yet`);
  checkChildren(tag, target, escape, forbid);
  return found;
}

/** Element children are content the piece did not declare; only snippets for the piece's declared slots pass. */
function checkChildren(tag: SyntaxNode, { label: id, slots }: Target, escape: (what: string) => void, forbid: (attribute: string) => void) {
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
    const tags: { tag: SyntaxNode; mount: Mount }[] = [], owner = context.owners.of(path);
    const skipSpreads = owner?.kind === "piece" && owner.dispatch;
    componentTags(context, path, parsed.fragment, new Map(), tags);
    for (const { tag, mount } of tags) {
      const id = mount && "file" in mount ? context.owners.pieceOfEntry(mount.file) : undefined;
      const target = mount && "table" in mount ? tableTarget(mount.table) : id === undefined ? undefined : pieceTarget(context, id);
      if (target) found.push(...checkTag(path, parsed, tag, target, skipSpreads));
    }
  }
  return found;
};
