// Law: a piece tag, anywhere, passes only the plain props its contract declares; presentation stays inside the piece.
// Raises PRESENTATION_ESCAPE. E owns every attribute and child-content report on a piece tag, including a dispatcher's
// `{@const R = table[key]}` lookup (D2 owns only the dispatcher's grammar and its spreads). A computed lookup mounts one of
// the table's pieces: the forbidden list, aria attributes and child content are judged now; judging its plain props needs
// the entries' closed contracts (a prop passes when every entry declares it) and waits for them.
// A Component tag must resolve to a direct import, a member of one, or a `{@const}` alias of those (plus a dispatcher's
// table lookup); anything else that mounts a component (`<svelte:component>`, a script variable, `$derived`, a prop, an
// each/snippet/await binding, a computed or destructured `{@const}`, a local object member) cannot be checked and escapes.
// Child content fills the piece's declared `children` slot and a snippet its named slot; each slot takes only the pieces it
// accepts (raw text and native elements inside it are rule D's).
import ts from "typescript";
import type { SyntaxNode } from "./walk.ts";
import type { ReadContract } from "../read-contract.ts";
import { parseable, type ContentRule, type GateContext } from "./context.ts";
import type { ParsedSvelte } from "./parse.ts";
import { exportedNames } from "./resolve-imports.ts";
import { contractEscapes, isPresentationName } from "./presentation-contract.ts";
import { violation, type Violation } from "./violation.ts";

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

/** What a tag mounts: one piece's entry file, one of the pieces of an imported component table (a dispatcher's computed
 * lookup), or a component E cannot see through, named by how it was mounted. Undefined: nothing E judges (a non-piece). */
type Mount = Readonly<{ file: string } | { table: string } | { through: string }> | undefined;
/** Names the template binds: a `{@const}` with what it mounts, or a block binding (each, snippet, await, let:). */
type Scope = ReadonlyMap<string, Mount>;
/** What a file's tags are resolved against: its imports, its script declarations, its snippets, and whether it dispatches. */
type FileFacts = Readonly<{ context: GateContext; path: string; script: ReadonlyMap<string, string>; snippets: ReadonlySet<string>; dispatch: boolean }>;
const fileMount = (file: string | undefined): Mount => file === undefined ? undefined : { file };
const through = (form: string): Mount => ({ through: form });

/** An imported binding that is not itself a component: a table of components, or a namespace of them. */
function isComponentTable(context: GateContext, path: string, local: string): boolean {
  const found = importOf(context, path, local);
  return found !== undefined && (found.binding.imported === "*" || !(context.definition(found.item, found.binding.imported) ?? "").endsWith(".svelte"));
}

/** Every name a binding pattern declares (`H`, `{ a, b: [c] }`, `...rest`, `x = 1`), in the Svelte AST or in TypeScript. */
function patternNames(pattern: unknown): string[] {
  switch (field(pattern, "type")) {
    case "Identifier": return [text(pattern, "name")];
    case "ObjectPattern": return nodes(pattern, "properties").flatMap(property => patternNames(property.type === "RestElement" ? property : field(property, "value")));
    case "ArrayPattern": return nodes(pattern, "elements").flatMap(patternNames);
    case "AssignmentPattern": return patternNames(field(pattern, "left"));
    case "RestElement": return patternNames(field(pattern, "argument"));
    default: return [];
  }
}
function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap(element => ts.isOmittedExpression(element) ? [] : bindingNames(element.name));
}

/** `$props()`, `$derived(...)` / `$derived.by(...)`, or anything else, as a mount form. */
function declarationForm(initializer: ts.Expression | undefined): string {
  const callee = initializer && ts.isCallExpression(initializer) ? initializer.expression.getText() : "";
  return callee === "$props" ? "a prop" : callee === "$derived" || callee === "$derived.by" ? "$derived" : "a script variable";
}
/** Every name the scripts of a file declare at their top level, with the form a tag mounted through it would have. */
function scriptDeclarations(parsed: ParsedSvelte): Map<string, string> {
  const found = new Map<string, string>();
  for (const { file } of parsed.scripts) for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      for (const name of bindingNames(declaration.name)) found.set(name, declarationForm(declaration.initializer));
    }
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) found.set(statement.name.text, "a script variable");
  }
  return found;
}
function snippetNames(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) { const items: readonly unknown[] = value; for (const item of items) snippetNames(item, found); return found; }
  if (!isNode(value)) return found;
  if (value.type === "SnippetBlock") found.add(text(field(value, "expression"), "name"));
  for (const [key, child] of Object.entries(value)) if (!skippedKeys.has(key)) snippetNames(child, found);
  return found;
}

/** A tag name not bound by the template: a direct import (a component, a namespace member, a static table entry), or a
 * name E cannot see through (a script declaration, a snippet, an undeclared name). */
function importedMount(facts: FileFacts, local: string, member: string | undefined): Mount {
  const { context, path } = facts;
  // A script declaration of the same name as an import is what the template mounts, whatever the import says.
  if (importOf(context, path, local) && facts.script.has(local)) return through("a script declaration that shadows an import");
  if (importOf(context, path, local)) {
    if (member === undefined) return fileMount(componentDefinition(context, path, local));
    return fileMount(importedDefinition(context, path, local, member) ?? registryEntry(context, path, local, member));
  }
  const declared = facts.script.get(local);
  if (declared !== undefined) return through(member !== undefined && declared === "a script variable" ? "a local object member" : declared);
  return through(facts.snippets.has(local) ? "a snippet" : "an undeclared name");
}

/** What `local` (or its `member`) mounts: a template binding in scope wins over an import of the same name. */
function mounted(facts: FileFacts, local: string, member: string | undefined, scope: Scope): Mount {
  if (!scope.has(local)) return importedMount(facts, local, member);
  const bound = scope.get(local);
  return member === undefined || bound && "through" in bound ? bound : through("a {@const} namespace alias");
}

/** What `{@const Local = init}` binds: an alias of a name, a static member, or (in a dispatcher) a table lookup. */
function constMount(facts: FileFacts, init: unknown, scope: Scope): Mount {
  if (field(init, "type") === "Identifier") return mounted(facts, text(init, "name"), undefined, scope);
  const object = field(init, "object"), property = field(init, "property");
  if (field(init, "type") !== "MemberExpression" || field(object, "type") !== "Identifier") return through("a computed {@const}");
  const table = text(object, "name"), literal = field(property, "value");
  const key = field(init, "computed") !== true ? text(property, "name") : typeof literal === "string" ? literal : undefined;
  if (key !== undefined) return mounted(facts, table, key, scope);
  const lookup = facts.dispatch && !scope.has(table) && isComponentTable(facts.context, facts.path, table);
  return lookup ? { table } : through("a computed {@const}");
}

/** The names a block binds for its children: each items and index, snippet parameters, await values, `let:` directives. */
function blockBindings(node: SyntaxNode): readonly (readonly [string, string])[] {
  const named = (form: string, ...patterns: unknown[]) => patterns.flatMap(patternNames).map(name => [name, form] as const);
  switch (node.type) {
    case "EachBlock": return [...named("an each binding", field(node, "context")), ...text(node, "index") ? [[text(node, "index"), "an each binding"] as const] : []];
    case "SnippetBlock": return named("a snippet parameter", ...nodes(node, "parameters"));
    case "AwaitBlock": return named("an await binding", field(node, "value"), field(node, "error"));
    default: return nodes(node, "attributes").filter(attribute => attribute.type === "LetDirective")
      .flatMap(attribute => field(attribute, "expression") ? named("a let: binding", field(attribute, "expression")) : [[text(attribute, "name"), "a let: binding"] as const]);
  }
}

/** The scope inside a node: its block bindings, then the `{@const}` tags among its children, in order. */
function innerScope(facts: FileFacts, value: SyntaxNode, scope: Scope): Scope {
  const bindings = blockBindings(value), consts = nodes(value, "nodes").filter(child => child.type === "ConstTag");
  if (!bindings.length && !consts.length) return scope;
  const next = new Map(scope);
  for (const [name, form] of bindings) next.set(name, through(form));
  for (const constant of consts) for (const declarator of nodes(field(constant, "declaration"), "declarations")) {
    const id = field(declarator, "id");
    if (field(id, "type") === "Identifier") next.set(text(id, "name"), constMount(facts, field(declarator, "init"), next));
    else for (const name of patternNames(id)) next.set(name, through("a {@const} destructure"));
  }
  return next;
}

/** Every Component tag (and `<svelte:component>`) with what it mounts. */
function componentTags(facts: FileFacts, value: unknown, scope: Scope, found: { tag: SyntaxNode; mount: Mount }[]) {
  if (Array.isArray(value)) { const items: readonly unknown[] = value; for (const item of items) componentTags(facts, item, scope, found); return; }
  if (!isNode(value)) return;
  const inner = innerScope(facts, value, scope);
  const [local = "", member] = text(value, "name").split(".");
  if (value.type === "Component") found.push({ tag: value, mount: mounted(facts, local, member, inner) });
  if (value.type === "SvelteComponent") found.push({ tag: value, mount: through("svelte:component") });
  for (const [key, child] of Object.entries(value)) if (!skippedKeys.has(key)) componentTags(facts, child, inner, found);
}

/** How an attribute reads in a message, or undefined when it is a plain attribute that only the contract can judge. */
export function forbiddenAttribute(parsed: ParsedSvelte, attribute: SyntaxNode): string | undefined {
  const name = text(attribute, "name");
  switch (attribute.type) {
    case "Attribute": return isPresentationName(name) ? name : undefined;
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

/** The piece(s) a tag mounts, as the law judges them: `label` names them, `slots` maps each declared slot to the piece ids
 * it accepts, `plain` says whether plain props are judged now. */
type Target = Readonly<{ label: string; contract: ReadContract | undefined; slots: ReadonlyMap<string, readonly string[]>; plain: boolean }>;
function pieceTarget(context: GateContext, id: string): Target {
  const declaration = context.owners.declaration(id)?.declaration;
  const slots = declaration && declaration.kind !== "mechanism" ? Object.entries(declaration.slots ?? {}).map(([name, slot]) => [name, slot.accepts] as const) : [];
  return { label: id, contract: context.contract(id), slots: new Map(slots), plain: true };
}
const tableTarget = (table: string): Target => ({ label: `an entry of ${table}`, contract: undefined, slots: new Map(), plain: false });
/** The piece a Component tag of this file mounts, by its node. */
type PieceOf = (tag: SyntaxNode) => string | undefined;

function checkTag(path: string, parsed: ParsedSvelte, tag: SyntaxNode, target: Target, skipSpreads: boolean, pieceOf: PieceOf): Violation[] {
  const found: Violation[] = [], line = parsed.line(tag.start ?? 0), name = text(tag, "name"), { label: id, contract } = target;
  const escape = (what: string) => found.push(violation("PRESENTATION_ESCAPE", path, line, `<${name}> ${what}`));
  const forbid = (attribute: string) => escape(`passes ${attribute}: a piece takes only the plain props its contract declares; contract: ${id}`);
  const undeclared: string[] = [];
  for (const attribute of nodes(tag, "attributes")) {
    if (attribute.type === "SpreadAttribute" && skipSpreads) continue;
    // A caller may bind a piece's instance only when the contract declares the instance API it exposes.
    if (attribute.type === "BindDirective" && text(attribute, "name") === "this" && contract?.closed && Object.keys(contract.instance).length) continue;
    const forbidden = forbiddenAttribute(parsed, attribute);
    if (forbidden !== undefined) { forbid(forbidden); continue; }
    const attributeName = text(attribute, "name");
    if (contract?.closed && declares(contract, attributeName)) continue;
    if (contract?.closed || attributeName.startsWith("aria-")) escape(`passes ${attributeName}, which the contract of ${id} does not declare`);
    else if (target.plain) undeclared.push(attributeName);
  }
  if (undeclared.length) escape(`passes ${undeclared.join(", ")}: the contract of ${id} declares no props yet`);
  checkChildren(tag, target, escape, forbid, pieceOf);
  return found;
}

/** The pieces mounted directly in slot content: through elements and blocks, not inside another piece's own content. */
function slotPieces(value: unknown, pieceOf: PieceOf, found: string[] = []): string[] {
  if (Array.isArray(value)) { const items: readonly unknown[] = value; for (const item of items) slotPieces(item, pieceOf, found); return found; }
  if (!isNode(value)) return found;
  if (value.type === "Component") { const id = pieceOf(value); if (id !== undefined) found.push(id); return found; }
  for (const [key, child] of Object.entries(value)) if (!skippedKeys.has(key)) slotPieces(child, pieceOf, found);
  return found;
}

/** Child content fills the piece's `children` slot and each snippet its named slot; a slot takes only the pieces it accepts.
 * Raw text and native elements inside a slot are rule D's. Content for a slot the piece does not declare is an escape. */
function checkChildren(tag: SyntaxNode, { label: id, slots }: Target, escape: (what: string) => void, forbid: (attribute: string) => void, pieceOf: PieceOf) {
  const accepts = (slot: string, content: unknown) => {
    const accepted = slots.get(slot) ?? [];
    for (const child of slotPieces(content, pieceOf)) if (!accepted.includes(child)) escape(`slot ${slot} of ${id} accepts ${accepted.join(", ")}; got ${child}`);
  };
  const content: SyntaxNode[] = [];
  for (const child of nodes(field(tag, "fragment"), "nodes")) {
    if (child.type === "Comment" || child.type === "Text" && text(child, "data").trim() === "") continue;
    if (child.type !== "SnippetBlock") { content.push(child); continue; }
    const snippet = text(field(child, "expression"), "name");
    if (slots.has(snippet)) accepts(snippet, field(child, "body"));
    else if (snippet === "children") forbid("children");
    else escape(`receives snippet ${snippet}, which ${id} declares no slot for`);
  }
  if (!content.length) return;
  if (slots.has("children")) accepts("children", content);
  else escape(`receives child content, which ${id} declares no slot for`);
}

/** A tag E cannot resolve to a piece: whatever it mounts escapes the law. */
const unchecked = (path: string, parsed: ParsedSvelte, tag: SyntaxNode, form: string) => violation("PRESENTATION_ESCAPE", path, parsed.line(tag.start ?? 0),
  `<${text(tag, "name")}>: a component mounted through ${form} cannot be checked; import it from the catalog index`);

export const ruleE: ContentRule = context => {
  const found: Violation[] = contractEscapes(context);
  for (const path of context.paths) {
    if (!path.endsWith(".svelte")) continue;
    const parsed = context.parsed(path);
    if (parsed.kind !== "svelte") continue;
    const tags: { tag: SyntaxNode; mount: Mount }[] = [], owner = context.owners.of(path);
    const dispatch = owner?.kind === "piece" && owner.dispatch, skipSpreads = dispatch;
    const facts: FileFacts = { context, path, script: scriptDeclarations(parsed), snippets: snippetNames(parsed.fragment), dispatch };
    componentTags(facts, parsed.fragment, new Map(), tags);
    const pieces = new Map(tags.map(({ tag, mount }) => [tag, mount && "file" in mount ? context.owners.pieceOfEntry(mount.file) : undefined] as const));
    const pieceOf: PieceOf = tag => pieces.get(tag);
    for (const { tag, mount } of tags) {
      if (mount && "through" in mount) { found.push(unchecked(path, parsed, tag, mount.through)); continue; }
      const id = pieceOf(tag);
      const target = mount && "table" in mount ? tableTarget(mount.table) : id === undefined ? undefined : pieceTarget(context, id);
      if (target) found.push(...checkTag(path, parsed, tag, target, skipSpreads, pieceOf));
    }
  }
  return found;
};
