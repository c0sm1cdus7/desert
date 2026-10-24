// The one host capability nonvisual code may hold: the browser session module may read the launch location, replace the
// history entry once, and guard unsent drafts with a beforeunload handler. Under those names it gains no other Window or
// DOM access; the handler may only cancel leaving, never reach Window through its event. Used by rule N.
import ts from "typescript";
import type { RuntimeCode, RuntimeUse } from "./runtime-globals.ts";

/** The globals the session module may name, beyond the nonvisual ones. */
export const browserHostGlobals: ReadonlySet<string> = new Set(["window", "history", "location"]);

const isAssignment = (node: ts.Node, target: ts.Node) => ts.isBinaryExpression(node) && node.left === target
  && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;

/** What the beforeunload handler does that is not cancelling: reading its event, forwarding it, or an opaque handler. */
function unloadProblems({ file, checker }: RuntimeCode, expression: ts.Expression | undefined): RuntimeUse[] {
  let callback = expression;
  if (callback && ts.isIdentifier(callback)) {
    const declaration = checker.getSymbolAtLocation(callback)?.valueDeclaration;
    const constant = declaration !== undefined && declaration.getSourceFile() === file && ts.isVariableDeclaration(declaration)
      && ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const) !== 0;
    callback = constant && ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
  }
  const anchor = expression ?? file;
  if (!callback || !ts.isArrowFunction(callback) || callback.parameters.length !== 1) return [{ name: "opaque unload callback", node: anchor }];
  const [parameter] = callback.parameters;
  if (!parameter || !ts.isIdentifier(parameter.name) || parameter.initializer || parameter.dotDotDotToken) return [{ name: "opaque unload event", node: anchor }];
  const event = checker.getSymbolAtLocation(parameter.name), found: RuntimeUse[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node !== parameter.name && checker.getSymbolAtLocation(node) === event) {
      const member = node.parent;
      if (!ts.isPropertyAccessExpression(member) || member.expression !== node) found.push({ name: "escaped unload event", node });
      else {
        const operation = member.parent;
        const cancel = member.name.text === "preventDefault" && ts.isCallExpression(operation) && operation.expression === member && operation.arguments.length === 0;
        const legacyCancel = member.name.text === "returnValue" && isAssignment(operation, member) && ts.isBinaryExpression(operation)
          && operation.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isStringLiteral(operation.right) && operation.right.text === "";
        if (!cancel && !legacyCancel) found.push({ name: "foreign unload event capability", node });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
  return found;
}

/** Each use of window, history or location in the session module beyond its one capability. */
export function browserHostProblems(code: RuntimeCode): readonly RuntimeUse[] {
  const found: RuntimeUse[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && browserHostGlobals.has(node.text) && !code.checker.getSymbolAtLocation(node)?.valueDeclaration) {
      const member = node.parent, call = member.parent;
      if (!ts.isPropertyAccessExpression(member) || member.expression !== node) found.push({ name: "opaque browser host access", node });
      else if (node.text === "location") {
        if (!["hash", "pathname", "search"].includes(member.name.text) || isAssignment(call, member)) found.push({ name: "foreign location access", node });
      } else if (!ts.isCallExpression(call) || call.expression !== member) found.push({ name: "escaped browser host capability", node });
      else if (node.text === "history") {
        if (member.name.text !== "replaceState") found.push({ name: "foreign history access", node });
      } else {
        const [event, handler, ...options] = call.arguments;
        const listener = ["addEventListener", "removeEventListener"].includes(member.name.text);
        if (!listener || !event || !ts.isStringLiteral(event) || event.text !== "beforeunload") found.push({ name: "foreign browser event", node });
        else if (options.length || !handler) found.push({ name: "opaque browser event options", node });
        else found.push(...unloadProblems(code, handler));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(code.file);
  return found;
}
