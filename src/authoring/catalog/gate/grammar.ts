// Rule K. Law: everything a product author can write in a View (each `Components.X` key and each kind of the view
// schema's `ViewContent`/`ViewItem` unions) is drawn by one authorable composition, named in the hand map
// `src/views/grammar-map.ts` until slice 5 generates both sides. Every file is read as data, never evaluated.
// Raises: GRAMMAR_NOT_IN_CATALOG; CATALOG_GATE_SOURCES when a grammar source is not among the layout's `gate.reads`.
//
// The sources are the layout's `gate.reads`; each grammar role is found by the constant its file declares:
// `Components` (the authoring builders), `ViewContentSchema` and `ViewItemSchema` (the view schema, whose imported
// member schemas are followed into their files), and `grammarMap`, written as
//   export const grammarMap = { Header: "place-header", header: "place-header" } as const;
// (keys: Components keys or view kinds; values: composition ids).
import { posix } from "node:path";
import ts from "typescript";
import type { GateContext, ContentRule } from "./context.ts";
import { violation, type Violation } from "./violation.ts";

const code = "GRAMMAR_NOT_IN_CATALOG";
const roles = Object.freeze({ map: "grammarMap", components: "Components", content: "ViewContentSchema" } as const);
const contentRoots = Object.freeze(["ViewContentSchema", "ViewItemSchema"] as const);

type Located = Readonly<{ name: string; path: string; line: number }>;
type GrammarName = Located & Readonly<{ label: string }>;
type Entry = Located & Readonly<{ id: string }>;
type Module = Readonly<{ path: string; file: ts.SourceFile; line: (node: ts.Node) => number }>;

class Reading {
  readonly context: GateContext;
  readonly missing = new Set<string>();
  readonly problems: Violation[] = [];
  constructor(context: GateContext) { this.context = context; }
  module(path: string): Module | undefined {
    const listed = this.context.layout.gate.reads.includes(path);
    if (!listed || this.context.text(path) === undefined) { this.missing.add(path); return undefined; }
    const parsed = this.context.parsed(path), [script] = parsed.scripts;
    if (!script) { this.missing.add(path); return undefined; }
    return { path, file: script.file, line: node => parsed.line(script.offset + node.getStart(script.file)) };
  }
  fail(at: Module, node: ts.Node, what: string): undefined {
    this.problems.push(violation(code, at.path, at.line(node), `the view grammar is not readable as data: ${what}`));
    return undefined;
  }
}

const nameOf = (name: ts.PropertyName | ts.BindingName) => ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
const typeCall = (node: ts.CallExpression) => ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)
  && node.expression.expression.text === "Type" ? node.expression.name.text : undefined;
const isFreeze = (node: ts.CallExpression) => ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)
  && node.expression.expression.text === "Object" && node.expression.name.text === "freeze";
const unwrapped = (node: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) ? unwrapped(node.expression) : node;

function constant(at: Module, name: string): ts.VariableDeclaration | undefined {
  for (const statement of at.file.statements) if (ts.isVariableStatement(statement)) {
    const found = statement.declarationList.declarations.find(declaration => nameOf(declaration.name) === name);
    if (found) return found;
  }
  return undefined;
}

function imported(at: Module, name: string): Readonly<{ path: string; name: string }> | undefined {
  for (const statement of at.file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const bindings = statement.importClause?.namedBindings, specifier = statement.moduleSpecifier.text;
    const element = bindings && ts.isNamedImports(bindings) ? bindings.elements.find(item => item.name.text === name) : undefined;
    if (element && specifier.startsWith(".")) return { path: posix.join(posix.dirname(at.path), specifier), name: (element.propertyName ?? element.name).text };
  }
  return undefined;
}

/** The `kind` literals of a TypeBox schema expression: unions, spreads of `X.anyOf`, closed objects, one-argument wrappers. */
function kindsOf(reading: Reading, at: Module, node: ts.Expression, seen: Set<string>, kinds: Located[]): void {
  const expression = unwrapped(node);
  if (ts.isIdentifier(expression)) return binding(reading, at, expression, seen, kinds);
  if (!ts.isCallExpression(expression)) return reading.fail(at, expression, `${expression.getText(at.file)} is not a schema`);
  const typed = typeCall(expression), [first] = expression.arguments;
  if (typed === "Union" && first && ts.isArrayLiteralExpression(first)) {
    for (const element of first.elements) {
      if (!ts.isSpreadElement(element)) { kindsOf(reading, at, element, seen, kinds); continue; }
      const spread = element.expression;
      if (ts.isPropertyAccessExpression(spread) && spread.name.text === "anyOf") kindsOf(reading, at, spread.expression, seen, kinds);
      else reading.fail(at, element, `${element.getText(at.file)} is not a spread of a union's anyOf`);
    }
    return;
  }
  if (first && ts.isObjectLiteralExpression(first) && (typed === "Object" || typed === undefined)) return objectKind(reading, at, first, kinds);
  if (typed === undefined && first && expression.arguments.length === 1) return kindsOf(reading, at, first, seen, kinds);
  return reading.fail(at, expression, `${expression.getText(at.file).slice(0, 60)} is not a union of kinds`);
}

function objectKind(reading: Reading, at: Module, object: ts.ObjectLiteralExpression, kinds: Located[]): void {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || nameOf(property.name) !== "kind" || !ts.isCallExpression(property.initializer)) continue;
    const [value] = property.initializer.arguments;
    if (typeCall(property.initializer) === "Literal" && value && ts.isStringLiteral(value)) {
      kinds.push({ name: value.text, path: at.path, line: at.line(value) });
      return;
    }
  }
  reading.fail(at, object, "a member of the union has no `kind: Type.Literal(\"…\")`");
}

function binding(reading: Reading, at: Module, identifier: ts.Identifier, seen: Set<string>, kinds: Located[]): void {
  const key = `${at.path}#${identifier.text}`;
  if (seen.has(key)) return;
  seen.add(key);
  const local = constant(at, identifier.text);
  if (local?.initializer) return kindsOf(reading, at, local.initializer, seen, kinds);
  const source = imported(at, identifier.text), target = source && reading.module(source.path);
  if (!source) return reading.fail(at, identifier, `${identifier.text} is neither a constant nor a relative named import`);
  const declared = target && constant(target, source.name);
  if (target && declared?.initializer) return kindsOf(reading, target, declared.initializer, seen, kinds);
  if (target) reading.fail(target, target.file, `${source.name} is not a constant of ${source.path}`);
}

function objectEntries(reading: Reading, at: Module, name: string): readonly Readonly<{ key: string; node: ts.ObjectLiteralElementLike }>[] {
  const declared = constant(at, name);
  const value = declared?.initializer && unwrapped(declared.initializer);
  const frozen = value && ts.isCallExpression(value) && isFreeze(value) ? value.arguments[0] : value;
  const object = frozen && unwrapped(frozen);
  if (!object || !ts.isObjectLiteralExpression(object)) { reading.fail(at, declared ?? at.file, `${name} is not an object literal`); return []; }
  return object.properties.flatMap(property => {
    const key = property.name && nameOf(property.name);
    if (key !== undefined && !ts.isSpreadAssignment(property)) return [{ key, node: property }];
    reading.fail(at, property, `${name} holds a property that is not a plain key`);
    return [];
  });
}

function mapEntries(reading: Reading, at: Module): readonly Entry[] {
  return objectEntries(reading, at, roles.map).flatMap(({ key, node }) => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) return [{ name: key, id: node.initializer.text, path: at.path, line: at.line(node) }];
    reading.fail(at, node, `grammarMap.${key} is not a composition id string`);
    return [];
  });
}

function entryViolation(context: GateContext, entry: Entry, grammar: ReadonlySet<string>): Violation | undefined {
  const at = (what: string) => violation(code, entry.path, entry.line, `grammar-map entry ${entry.name}: ${what}`);
  if (!grammar.has(entry.name)) return at("names no Components key or view kind");
  const declaration = context.owners.declaration(entry.id)?.declaration;
  if (!declaration) return at(`${entry.id} is not a declared piece`);
  if (declaration.kind !== "composition") return at(`${entry.id} is a ${declaration.kind}, not a composition`);
  return declaration.authorable === true ? undefined : at(`composition ${entry.id} is not authorable`);
}

const unloaded = (path: string) => violation("CATALOG_GATE_SOURCES", path, 1, `rule K reads ${path}, which is not in the layout's gate.reads`);

/** The one read source that declares `name`, or the violation saying why there is not exactly one. */
function roleModule(reading: Reading, modules: readonly Module[], name: string): Module | Violation {
  const holders = modules.filter(at => constant(at, name) !== undefined);
  if (holders.length === 1 && holders[0]) return holders[0];
  const where = holders.map(at => at.path).join(", ") || "none of them";
  return violation("CATALOG_GATE_SOURCES", reading.context.layout.gate.reads.join(", "), 1, `rule K needs one gate.reads source declaring ${name}; found ${where}`);
}

function grammarNames(reading: Reading, components: Module, content: Module): readonly GrammarName[] {
  const keys: GrammarName[] = objectEntries(reading, components, roles.components)
    .map(({ key, node }) => ({ name: key, label: `Components.${key}`, path: components.path, line: components.line(node) }));
  const kinds: Located[] = [], seen = new Set<string>();
  for (const root of contentRoots) {
    const declared = constant(content, root);
    if (declared?.initializer) kindsOf(reading, content, declared.initializer, seen, kinds);
    else reading.fail(content, content.file, `${root} is not a constant`);
  }
  const grammar = new Map<string, GrammarName>();
  for (const item of [...keys, ...kinds.map(kind => ({ ...kind, label: `view kind ${kind.name}` }))]) if (!grammar.has(item.name)) grammar.set(item.name, item);
  return [...grammar.values()];
}

export const ruleK: ContentRule = context => {
  const reading = new Reading(context);
  const modules = context.layout.gate.reads.flatMap(path => reading.module(path) ?? []);
  const found = [roles.map, roles.components, roles.content].map(name => roleModule(reading, modules, name));
  const [map, components, content] = found;
  if (!map || !components || !content || "code" in map || "code" in components || "code" in content) {
    return [...[...reading.missing].sort().map(unloaded), ...found.flatMap(item => "code" in item ? [item] : [])];
  }
  const grammar = grammarNames(reading, components, content), entries = mapEntries(reading, map);
  if (reading.missing.size || reading.problems.length) return [...[...reading.missing].sort().map(unloaded), ...reading.problems];
  const mapped = new Set(entries.map(entry => entry.name)), names = new Set(grammar.map(item => item.name));
  const unmapped = grammar.filter(item => !mapped.has(item.name))
    .map(item => violation(code, item.path, item.line, `${item.label} maps to no authorable composition in ${posix.basename(map.path)}`));
  return [...unmapped, ...entries.flatMap(entry => entryViolation(context, entry, names) ?? [])];
};
