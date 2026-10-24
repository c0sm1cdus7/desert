// Rule D2, the dispatcher's authority: the input is admitted by its validator before any branch reads it, and nothing
// replaces that authority afterwards. The kind chain tests the admitted node; the resolved-node grammar has a branch for
// every resolved node kind; a branch looks its kind up in the generated table; a private host capability reaches only
// the kind it belongs to, as received; a script neither shadows nor mutates the input, the validator, the table or the
// admitted node, asserts no type, and never reads the table or the raw input. Raises DISPATCHER_GRAMMAR.
import ts from "typescript";
import { ResolvedNodes } from "../../../interaction/catalog.ts";
import type { CompositionFile } from "./composition-template.ts";
import type { GateContext } from "./context.ts";
import { scriptLine } from "./parse.ts";
import { resolveSpecifier } from "./resolve-imports.ts";
import { violation, type Violation } from "./violation.ts";
import { field, list, text, walk, type SyntaxNode } from "./walk.ts";

const grammar = "DISPATCHER_GRAMMAR";

/** `a.b.c` of a plain member path, or undefined for anything computed. */
export function pathOf(node: unknown): string | undefined {
  const type = field(node, "type");
  if (type === "Identifier") return text(node, "name");
  if (type !== "MemberExpression" || field(node, "computed") === true || field(node, "optional") === true) return undefined;
  const object = pathOf(field(node, "object")), property = pathOf(field(node, "property"));
  return object === undefined || property === undefined ? undefined : `${object}.${property}`;
}

/** One branch of a kind chain, as rule D2 reads it. */
export type Branch = Readonly<{ kinds: readonly string[]; node: SyntaxNode; lookups: readonly SyntaxNode[]; tags: readonly SyntaxNode[] }>;
export type Chain = Readonly<{ subject: string | undefined; branches: readonly Branch[] }>;

type Channel = Readonly<{ kind: string; input: string; required: boolean }>;
const unwrap = (node: ts.Expression): ts.Expression => ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)
  ? unwrap(node.expression) : ts.isCallExpression(node) && node.arguments.length === 1 && node.arguments[0] ? unwrap(node.arguments[0]) : node;
const keyOf = (name: ts.PropertyName) => ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
/** The private host channels, `export const DispatcherCapabilities = freezeDeep({ <kind>: { property, input, required } })` in
 * the renderer contracts, read as data (the gate never runs a module of the tree it judges), keyed by the property. */
function readCapabilities(source: string | undefined): ReadonlyMap<string, Channel> | undefined {
  if (source === undefined) return undefined;
  const file = ts.createSourceFile("renderer-contracts.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), found = new Map<string, Channel>();
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "DispatcherCapabilities" || !declaration.initializer) continue;
    const table = unwrap(declaration.initializer);
    if (!ts.isObjectLiteralExpression(table)) return undefined;
    for (const entry of table.properties) {
      const kind = ts.isPropertyAssignment(entry) ? keyOf(entry.name) : undefined, value = ts.isPropertyAssignment(entry) ? entry.initializer : undefined;
      if (kind === undefined || !value || !ts.isObjectLiteralExpression(value)) return undefined;
      const fields = new Map(value.properties.flatMap(item => ts.isPropertyAssignment(item) && keyOf(item.name) ? [[keyOf(item.name), item.initializer] as const] : []));
      const property = fields.get("property"), input = fields.get("input"), required = fields.get("required")?.kind;
      if (!property || !ts.isStringLiteral(property) || !input || !ts.isStringLiteral(input)
        || (required !== ts.SyntaxKind.TrueKeyword && required !== ts.SyntaxKind.FalseKeyword)) return undefined;
      found.set(property.text, { kind, input: input.text, required: required === ts.SyntaxKind.TrueKeyword });
    }
    return found;
  }
  return undefined;
}

/** Identifiers an expression reads (member names and object keys are not reads). */
function reads(expression: unknown): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  walk(expression, (node, parent) => {
    if (node.type !== "Identifier") return;
    const member = parent?.type === "MemberExpression" && field(parent, "property") === node && field(parent, "computed") !== true;
    const key = parent?.type === "Property" && field(parent, "key") === node && field(parent, "computed") !== true && field(parent, "shorthand") !== true;
    if (!member && !key) found.push(node);
  });
  return found;
}

type Script = Readonly<{ protectedNames: ReadonlySet<string>; tables: ReadonlySet<string>; admitted: string | undefined; hosts: ReadonlySet<string> }>;

/** The instance script: its props, its admission and every use of the dispatcher's authorities. */
function scriptViolations(context: GateContext, file: CompositionFile, input: string, validator: Readonly<{ module: string; name: string }>,
  tables: ReadonlySet<string>, capabilities: ReadonlyMap<string, Channel>, report: (line: number, what: string) => void): Script {
  const validators = new Set<string>();
  for (const item of context.imports(file.path)) {
    const binding = item.bindings.find(candidate => candidate.imported === validator.name);
    const target = resolveSpecifier(file.path, item.specifier, () => true, context.layout.aliases);
    if (binding && item.form === "import" && !item.typeOnly && target.kind === "file" && target.path === validator.module) validators.add(binding.local);
  }
  const inputs = new Set<string>(), hosts = new Set<string>();
  let admitted: string | undefined;
  const instance = file.parsed.scripts.find(script => !script.module);
  if (!instance) return { protectedNames: new Set(), tables, admitted, hosts };
  const at = (node: ts.Node) => scriptLine(file.parsed, instance, node);
  const declarations = new Set<ts.Node>();
  for (const statement of instance.file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.parameters.length === 0
      && statement.body?.statements.some(item => ts.isReturnStatement(item) && item.expression !== undefined && ts.isIdentifier(item.expression))) hosts.add(statement.name.text);
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const call = declaration.initializer && ts.isCallExpression(declaration.initializer) ? declaration.initializer : undefined;
      const callee = call?.expression.getText(instance.file);
      if (callee === "$props" && ts.isObjectBindingPattern(declaration.name)) {
        declarations.add(declaration);
        for (const element of declaration.name.elements) {
          if (element.dotDotDotToken || element.propertyName || !ts.isIdentifier(element.name)) { report(at(element), "a dispatcher input is renamed or collected: name each input"); continue; }
          inputs.add(element.name.text);
          if (element.initializer && [...capabilities.values()].some(channel => channel.input === element.name.getText(instance.file))) {
            report(at(element), `manufactured dispatcher capability: ${element.name.getText(instance.file)} has a default`);
          }
        }
      }
      const [argument] = call?.arguments ?? [];
      const inner = callee === "$derived" && argument && ts.isCallExpression(argument) ? argument : undefined;
      const admits = inner && ts.isIdentifier(inner.expression) && validators.has(inner.expression.text) && inner.arguments.length === 1
        && inner.arguments[0]?.getText(instance.file) === input && ts.isIdentifier(declaration.name);
      if (admits && ts.isIdentifier(declaration.name)) {
        if (admitted !== undefined) report(at(declaration), "the input is admitted twice");
        admitted = declaration.name.text;
        declarations.add(declaration);
      }
    }
  }
  if (admitted === undefined) report(0, `no \`let <node> = $derived(${validator.name}(${input}))\`: the dispatcher reads an unvalidated input`);
  const protectedNames = new Set([...inputs, ...validators, ...tables, ...admitted === undefined ? [] : [admitted]]);
  const bound = (name: ts.BindingName): string[] => ts.isIdentifier(name) ? [name.text]
    : name.elements.flatMap(element => ts.isOmittedExpression(element) ? [] : bound(element.name));
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) return;
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && !declarations.has(node)) {
      for (const name of bound(node.name)) if (protectedNames.has(name)) report(at(node), `${name} is shadowed: the dispatcher's authority has one binding`);
    }
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && protectedNames.has(node.name.text)) report(at(node), `${node.name.text} is shadowed: the dispatcher's authority has one binding`);
    const target = ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment ? node.left
      : ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator) ? node.operand : undefined;
    const root = target?.getText(instance.file).split(/[.[]/, 1)[0];
    if (root !== undefined && protectedNames.has(root)) report(at(node), `${root} is mutated: the dispatcher's authority is read-only`);
    if (ts.isAsExpression(node) && node.type.getText(instance.file) !== "const" || ts.isTypeAssertionExpression(node)) report(at(node), "a type assertion in the dispatcher");
    if (ts.isIdentifier(node) && tables.has(node.text) && !ts.isImportSpecifier(node.parent)) report(at(node), `${node.text} is read in the script: a table is read only by a branch's {@const} lookup`);
    if (ts.isIdentifier(node) && node.text === input && Reflect.get(node.parent, "name") !== node && !ts.isBindingElement(node.parent)
      && !(ts.isCallExpression(node.parent) && ts.isIdentifier(node.parent.expression) && validators.has(node.parent.expression.text))) {
      report(at(node), `the raw ${input} is read: read the admitted node`);
    }
    ts.forEachChild(node, visit);
  };
  visit(instance.file);
  return { protectedNames, tables, admitted, hosts };
}

/** The template half: lookups by the branch's kind, capabilities to their kind, no authority read in an attribute. */
function branchViolations(input: string, chain: Chain, script: Script, capabilities: ReadonlyMap<string, Channel>,
  report: (node: unknown, what: string) => void): void {
  for (const branch of chain.branches) {
    const locals = new Set<string>();
    for (const lookup of branch.lookups) {
      const declarator = list(field(field(lookup, "declaration"), "declarations"))[0], init = field(declarator, "init");
      locals.add(text(field(declarator, "id"), "name"));
      const property = field(init, "property"), computed = field(init, "computed") === true;
      const key = computed ? pathOf(property) : text(property, "name");
      const byKind = computed ? key === `${chain.subject}.kind` && branch.kinds.length === 1 : branch.kinds.length === 1 && key === branch.kinds[0];
      if (!byKind) report(lookup, `the lookup ${computed ? `[${key ?? "a computed key"}]` : `.${key}`} is not this branch's kind (${branch.kinds.join(", ")})`);
    }
    for (const tag of branch.tags) for (const attribute of list(field(tag, "attributes"))) {
      const name = text(attribute, "name"), expression = field(field(attribute, "value"), "expression") ?? list(field(attribute, "value"))
        .map(part => field(part, "expression")).find(value => value !== undefined) ?? field(attribute, "expression");
      walk(expression, node => {
        if (["ImportExpression", "AssignmentExpression", "UpdateExpression", "TSAsExpression", "TSTypeAssertion"].includes(node.type ?? "")) {
          report(attribute, `${node.type} in a dispatched prop: a prop reads the admitted node`);
        }
      });
      for (const read of reads(expression)) {
        const local = text(read, "name");
        if (local === input || script.tables.has(local) || locals.has(local)) report(attribute, `${name} reads ${local}: a prop reads the admitted node, not the input, the table or the piece`);
      }
      const channel = capabilities.get(name);
      if (channel === undefined) continue;
      const host = field(expression, "type") === "CallExpression" && list(field(expression, "arguments")).length === 0 && script.hosts.has(text(field(expression, "callee"), "name"));
      const received = pathOf(expression) === channel.input;
      if (branch.kinds.length !== 1 || branch.kinds[0] !== channel.kind) report(attribute, `the capability ${name} belongs to ${channel.kind}, not to ${branch.kinds.join(", ")}`);
      else if (channel.required ? !host : !received) report(attribute, `the capability ${name} is ${channel.required ? "not passed through a guard that returns it" : `not ${channel.input} as received`}`);
    }
  }
}

/** Everything D2 checks about a dispatcher's authority, given the chain the grammar half read. */
export function admissionViolations(context: GateContext, file: CompositionFile, chain: Chain, tables: ReadonlySet<string>): Violation[] {
  const grammarOf = context.owners.declaration(file.id)?.declaration, dispatch = grammarOf?.kind === "composition" ? grammarOf.dispatch : undefined;
  const spec = dispatch === undefined ? undefined : context.layout.dispatch[dispatch];
  if (dispatch === undefined || spec === undefined) return [];
  const found: Violation[] = [];
  const reportLine = (line: number, what: string) => found.push(violation(grammar, file.path, line, `${what}; ${file.suffix}`));
  const report = (node: unknown, what: string) => { const start = field(node, "start"); reportLine(file.parsed.line(typeof start === "number" ? start : 0), what); };
  const capabilities = readCapabilities(context.text(context.layout.rendererTypes));
  if (capabilities === undefined) reportLine(0, `DispatcherCapabilities in ${context.layout.rendererTypes} is not a literal table of { property, input, required }`);
  const channels = capabilities ?? new Map<string, Channel>();
  const script = scriptViolations(context, file, spec.input, spec.validator, tables, channels, reportLine);
  if (script.admitted !== undefined && chain.subject !== undefined && chain.subject !== script.admitted) {
    reportLine(0, `the kind chain tests ${chain.subject}, not the admitted ${script.admitted}`);
  }
  branchViolations(spec.input, chain, script, channels, report);
  if (dispatch === "resolved-node") {
    const kinds = new Set<string>(ResolvedNodes.entries.map(entry => entry.id)), seen = new Set(chain.branches.flatMap(branch => branch.kinds));
    for (const kind of seen) if (!kinds.has(kind)) reportLine(0, `"${kind}" is not a resolved node kind`);
    for (const kind of kinds) if (!seen.has(kind)) reportLine(0, `the resolved node kind "${kind}" has no branch`);
  }
  return found;
}
