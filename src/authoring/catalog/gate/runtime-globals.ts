// The browser vocabulary of the pinned TypeScript compiler, and the runtime uses of it in a module. Used by rule N
// (nonvisual code reaches no browser global and no evaluator) and rule O (no piece runs code the gate cannot read).
// Types are not runtime: a name in a type position, or bound only by `declare`, grants nothing and hides nothing; a real
// lexical binding with the name of a global is that binding, not the global.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

/** Every function and variable lib.dom.d.ts declares, plus the evaluators: no hand-kept subset can miss a new API. */
export const browserGlobals: ReadonlySet<string> = (() => {
  const dom = ts.createSourceFile("lib.dom.d.ts", readFileSync(join(dirname(ts.getDefaultLibFilePath({})), "lib.dom.d.ts"), "utf8"),
    ts.ScriptTarget.Latest, true);
  const names = new Set(["globalThis", "global", "Function", "eval"]);
  for (const statement of dom.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) names.add(statement.name.text);
    if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    }
  }
  return names;
})();

/** Platform facilities that draw nothing: timers, structured clone, timing, network. DOM, CSS, canvas and motion are absent. */
export const nonvisualGlobals: ReadonlySet<string> = new Set([
  "structuredClone", "setTimeout", "clearTimeout", "performance", "fetch", "AbortSignal", "AbortController", "URLSearchParams",
]);

/** Packages nonvisual code may import, and the Svelte functions among them that draw nothing (lifecycle and context). */
export const nonvisualPackages: ReadonlySet<string> = new Set(["svelte", "svelte/store", "@sinclair/typebox", "@sinclair/typebox/value"]);
export const nonvisualFramework: ReadonlySet<string> = new Set(["onMount", "onDestroy", "untrack", "tick", "setContext", "getContext", "hasContext"]);

export type RuntimeUse = Readonly<{ name: string; node: ts.Node }>;
export type RuntimeCode = Readonly<{ file: ts.SourceFile; checker: ts.TypeChecker }>;

/** A checker over one module and nothing else, so only the module's own declarations resolve. */
export function runtimeCode(code: string): RuntimeCode {
  const name = "/checked-runtime.ts", file = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const options = { noLib: true, noResolve: true }, host = ts.createCompilerHost(options);
  host.getSourceFile = requested => requested === name ? file : undefined;
  return { file, checker: ts.createProgram([name], options, host).getTypeChecker() };
}

/** The constant string an expression evaluates to (literals, `+`, const aliases), when it has one. */
function constantText(checker: ts.TypeChecker, node: ts.Node | undefined, seen = new Set<ts.Node>()): string | undefined {
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return constantText(checker, node.expression, seen);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = constantText(checker, node.left, new Set(seen)), right = constantText(checker, node.right, new Set(seen));
    return left !== undefined && right !== undefined ? left + right : undefined;
  }
  if (!ts.isIdentifier(node)) return undefined;
  const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
  const constant = declaration && ts.isVariableDeclaration(declaration) && ts.isVariableDeclarationList(declaration.parent)
    && (declaration.parent.flags & ts.NodeFlags.Const) !== 0;
  return constant ? constantText(checker, declaration.initializer, seen) : undefined;
}

/** The member a node reads: `a.b`, `a["b"]`, a computed constant key, or the property of a destructuring. */
function memberRead(checker: ts.TypeChecker, node: ts.Node): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) return constantText(checker, node.argumentExpression);
  if (!ts.isBindingElement(node) || !node.propertyName) return undefined;
  const key = node.propertyName;
  if (ts.isIdentifier(key)) return key.text;
  return ts.isComputedPropertyName(key) ? constantText(checker, key.expression) : constantText(checker, key);
}

/** A declaration that exists at runtime: not `declare`, not inside a `declare` block, not a type. */
function isRuntimeDeclaration(declaration: ts.Declaration): boolean {
  if (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration) || ts.isTypeParameterDeclaration(declaration)) return false;
  for (let node: ts.Node | undefined = declaration; node; node = node.parent) {
    if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.DeclareKeyword)) return false;
  }
  return true;
}
/** The name resolves to a runtime binding of this module (a shorthand `{ x }` resolves to the value it reads). */
function isBound(checker: ts.TypeChecker, file: ts.SourceFile, node: ts.Identifier): boolean {
  const parent = node.parent;
  const symbol = ts.isShorthandPropertyAssignment(parent) ? checker.getShorthandAssignmentValueSymbol(parent) : checker.getSymbolAtLocation(node);
  return symbol?.declarations?.some(declaration => declaration.getSourceFile() === file && isRuntimeDeclaration(declaration)) === true;
}
/** Inside a type: a type annotation, a type query, `implements` or an interface's `extends` (a class's `extends` runs). */
function inTypePosition(node: ts.Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isHeritageClause(current)) return current.token === ts.SyntaxKind.ImplementsKeyword || ts.isInterfaceDeclaration(current.parent);
    if (ts.isTypeNode(current) && !ts.isExpressionWithTypeArguments(current)) return true;
    if (ts.isTypeAliasDeclaration(current) || ts.isInterfaceDeclaration(current)) return true;
  }
  return false;
}
/** A name the source writes but that does not run: a type, a declared name, a property or member name, a label. */
function isNotAReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (inTypePosition(node) || (ts.isTypeParameterDeclaration(parent) && parent.name === node)) return true;
  if ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)
    || ts.isPropertySignature(parent) || ts.isBindingElement(parent) && parent.propertyName === node) && Reflect.get(parent, "name") === node) return true;
  return (ts.isLabeledStatement(parent) || ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node;
}
const timers = new Set(["setTimeout", "setInterval"]);
const globalObjects = new Set(["window", "globalThis", "self", "global"]);

/** Ways to obtain an evaluator the gate cannot read: a function's constructor, prototype reflection, `Reflect` (except
 * `Reflect.ownKeys`), `eval`, `Function`, and a timer given a string of code. Not a sandbox: a reviewed source boundary. */
export function opaqueExecution({ file, checker }: RuntimeCode): readonly RuntimeUse[] {
  const found: RuntimeUse[] = [];
  const visit = (node: ts.Node): void => {
    const member = memberRead(checker, node);
    if (member === "constructor" || member === "__proto__") found.push({ name: `a function's ${member}`, node });
    const receiver = ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? node.expression : undefined;
    const global = receiver !== undefined && ts.isIdentifier(receiver) && globalObjects.has(receiver.text) && !isBound(checker, file, receiver);
    if (global && (member === "eval" || member === "Function")) found.push({ name: `${receiver.getText(file)}.${member}`, node });
    if (ts.isIdentifier(node) && !isNotAReference(node) && !isBound(checker, file, node)) {
      const parent = node.parent, name = node.text;
      const ownKeys = ts.isPropertyAccessExpression(parent) && parent.expression === node && parent.name.text === "ownKeys";
      if (name === "Reflect" && !ownKeys) found.push({ name: "Reflect", node });
      if (name === "eval" || name === "Function") found.push({ name, node });
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && timers.has(node.expression.text)
      && constantText(checker, node.arguments[0]) !== undefined) found.push({ name: `${node.expression.text} with a string of code`, node });
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** Each runtime reference to a browser global outside `allowed`: not a type, a member name, a label or a local binding. */
export function browserGlobalUses({ file, checker }: RuntimeCode, allowed: ReadonlySet<string>): readonly RuntimeUse[] {
  const found: RuntimeUse[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && browserGlobals.has(node.text) && !allowed.has(node.text) && !isNotAReference(node) && !isBound(checker, file, node)) {
      found.push({ name: node.text, node });
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
