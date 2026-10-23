import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import { assertNoOpaqueExecution } from "./opaque-execution.ts";

// The pinned compiler supplies the browser vocabulary, not a hand-maintained
// subset of DOM constructors that silently misses a newly available API.
const dom = ts.createSourceFile("lib.dom.d.ts", readFileSync(join(dirname(
  ts.getDefaultLibFilePath({})), "lib.dom.d.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const browserGlobals = new Set(["globalThis", "global", "Function", "eval"]);
for (const statement of dom.statements) {
  if (ts.isFunctionDeclaration(statement) && statement.name) browserGlobals.add(statement.name.text);
  if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name)) browserGlobals.add(declaration.name.text);
  }
}

/** Check emitted runtime code: erased types/declarations cannot grant a runtime
 * capability, and real lexical parameters may have the same name as a global. */
export function assertRuntimeGlobals(code: string, allowed: ReadonlySet<string>, fail: (name: string) => never) {
  const name = "/checked-runtime.ts";
  const file = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const options = { noLib: true, noResolve: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = requested => requested === name ? file : undefined;
  const checker = ts.createProgram([name], options, host).getTypeChecker();
  assertNoOpaqueExecution(file, checker, fail);
  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && browserGlobals.has(node.text) && !allowed.has(node.text)) {
      const parent = node.parent;
      const property = ts.isPropertyAccessExpression(parent) && parent.name === node
        || ts.isPropertyAssignment(parent) && parent.name === node
        || ts.isLabeledStatement(parent) && parent.label === node
        || (ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node;
      const symbol = ts.isShorthandPropertyAssignment(parent)
        ? checker.getShorthandAssignmentValueSymbol(parent) : checker.getSymbolAtLocation(node);
      const local = symbol?.declarations?.some(declaration => declaration.getSourceFile() === file);
      if (!property && !local) fail(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { file, checker };
}
