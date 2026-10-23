import { posix } from "node:path";
import ts from "typescript";
import { dispatcherPath } from "./dispatch-contract.ts";
import { DispatcherCapabilities } from "../../svelte/renderer-contracts.ts";
type Fail = (reason: string) => never;
const capabilities = new Set<string>(Object.values(DispatcherCapabilities).map(channel => channel.input));
/** Specifiers are derived from the dispatcher's location, never written as relative literals. */
const from = (target: string) => {
  const path = posix.relative(posix.dirname(dispatcherPath), target);
  return path.startsWith(".") ? path : `./${path}`;
};

/** The dispatcher may adapt semantic events, but component identity and node
 * admission have fixed owners and cannot be replaced by a caller or callback. */
export function inspectDispatchScript(source: string, inputs: ReadonlySet<string>, fail: Fail) {
  const file = ts.createSourceFile(dispatcherPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const owners = new Map<string, string>();
  const paths = new Map([
    [from("src/interaction/bank-node.ts"), "bankNode"], [from("src/interaction/bank-events.ts"), "bankEvent"],
    [from("src/svelte/renderer-registry.ts"), "webRenderers"],
  ]);
  let propsType: string | undefined;
  for (const statement of file.statements) if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    const clause = statement.importClause, bindings = clause?.namedBindings, specifier = statement.moduleSpecifier.text;
    if (clause?.isTypeOnly) {
      if (specifier === from("src/svelte/renderer-contracts.ts") && bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) {
        if ((item.propertyName ?? item.name).text === "BankRendererProps") propsType = item.name.text;
      }
      continue;
    }
    if (!paths.has(specifier) || clause?.name || !bindings || !ts.isNamedImports(bindings)) fail("foreign dispatcher import");
    for (const item of bindings.elements) if (!item.isTypeOnly) {
      const name = (item.propertyName ?? item.name).text;
      if (name !== paths.get(specifier) || owners.has(name)) fail("foreign dispatcher binding");
      owners.set(name, item.name.text);
    }
  }
  if (owners.size !== paths.size || !propsType) fail("missing dispatcher authority");
  const registry = owners.get("webRenderers")!, validator = owners.get("bankNode")!;
  let props: ts.VariableDeclaration | undefined, checked: ts.VariableDeclaration | undefined;
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) for (const node of statement.declarationList.declarations) {
    if (node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(file) === "$props") {
      if (props || !ts.isObjectBindingPattern(node.name) || node.type?.getText(file) !== propsType) fail("open dispatcher inputs");
      const names = node.name.elements.map(item => {
        if (item.dotDotDotToken || item.propertyName || !ts.isIdentifier(item.name)) fail("opaque dispatcher input");
        if (item.initializer && capabilities.has(item.name.text)) fail("manufactured dispatcher capability");
        return item.name.text;
      });
      if (names.length !== inputs.size || names.some(name => !inputs.has(name))) fail("foreign dispatcher input");
      props = node;
    }
    if (node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(file) === "$derived"
      && node.initializer.arguments.length === 1) {
      const call = node.initializer.arguments[0]!;
      if (ts.isCallExpression(call) && call.expression.getText(file) === validator && call.arguments.length === 1
        && call.arguments[0]!.getText(file) === "node" && ts.isIdentifier(node.name)) {
        if (checked) fail("duplicate dispatcher admission");
        checked = node;
      }
    }
  }
  if (!props || !checked || !ts.isIdentifier(checked.name)) fail("unvalidated dispatcher node");
  const checkedName = checked.name.text, protectedNames = new Set([...inputs, ...owners.values(), checkedName]);
  function visit(node: ts.Node): void {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) return;
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node !== props && node !== checked) {
      function binding(name: ts.BindingName): void {
        if (ts.isIdentifier(name)) { if (protectedNames.has(name.text)) fail("shadowed dispatcher authority"); }
        else for (const item of name.elements) if (!ts.isOmittedExpression(item)) binding(item.name);
      }
      binding(node.name);
    }
    if (ts.isIdentifier(node) && node.text === registry) fail("registry used outside dispatch");
    if (ts.isIdentifier(node) && node.text === "node" && node.parent !== props
      && !ts.isBindingElement(node.parent) && node.parent !== (checked as ts.VariableDeclaration).initializer
      && !(ts.isCallExpression(node.parent) && node.parent.expression.getText(file) === validator)) fail("raw dispatcher node");
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment || ts.isPostfixUnaryExpression(node)
      || ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) {
      const target = ts.isBinaryExpression(node) ? node.left : node.operand;
      const root = target.getText(file).split(/[.[]/, 1)[0]!;
      if (protectedNames.has(root)) fail("mutated dispatcher authority");
    }
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require")) fail("opaque dispatcher execution");
    ts.forEachChild(node, visit);
  }
  visit(file);
  // The one required device capability may only be forwarded by a local guard.
  const hosts = new Set(file.statements.filter(ts.isFunctionDeclaration).filter(node => node.parameters.length === 0
    && node.body?.statements.some(statement => ts.isReturnStatement(statement) && statement.expression?.getText(file) === "host"))
    .flatMap(node => node.name ? [node.name.text] : []));
  return { registry, checked: checkedName, hosts };
}
