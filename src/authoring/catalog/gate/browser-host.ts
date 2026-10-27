// The one host capability nonvisual code may hold: the browser session module may read the launch location, replace the
// history entry once, guard unsent drafts with a beforeunload handler, and hear the page return to view (read whether the
// document is visible, listen to its visibilitychange and the window's focus; DESIGN §8 Q3). Under those names it gains
// no other Window or DOM access: the unload handler may only cancel leaving, and a return-to-view handler never receives
// its event. Used by rule N.
import ts from "typescript";
import type { RuntimeCode, RuntimeUse } from "./runtime-globals.ts";

/** The globals the session module may name, beyond the nonvisual ones. */
export const browserHostGlobals: ReadonlySet<string> = new Set(["window", "history", "location", "document"]);

const isAssignment = (node: ts.Node, target: ts.Node) => ts.isBinaryExpression(node) && node.left === target
  && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;

/** The handler a listener names: the arrow written in place, or the one a constant of this file holds. */
function callbackOf({ file, checker }: RuntimeCode, expression: ts.Expression | undefined): ts.Expression | undefined {
  if (!expression || !ts.isIdentifier(expression)) return expression;
  const declaration = checker.getSymbolAtLocation(expression)?.valueDeclaration;
  const constant = declaration !== undefined && declaration.getSourceFile() === file && ts.isVariableDeclaration(declaration)
    && ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const) !== 0;
  return constant && ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
}

/** A return-to-view handler that could reach the host: anything but an arrow that takes no event. */
function returnProblems(code: RuntimeCode, expression: ts.Expression | undefined): RuntimeUse[] {
  const callback = callbackOf(code, expression);
  return callback && ts.isArrowFunction(callback) && callback.parameters.length === 0 ? []
    : [{ name: "opaque return-to-view handler", node: expression ?? code.file }];
}

/** What the beforeunload handler does that is not cancelling: reading its event, forwarding it, or an opaque handler. */
function unloadProblems(code: RuntimeCode, expression: ts.Expression | undefined): RuntimeUse[] {
  const { file, checker } = code, callback = callbackOf(code, expression);
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

/** What a window or document listener call registers beyond leaving (window) or returning to view (both). */
function listenerProblems(code: RuntimeCode, host: string, member: ts.PropertyAccessExpression, call: ts.CallExpression): RuntimeUse[] {
  const [event, handler, ...options] = call.arguments;
  const listener = ["addEventListener", "removeEventListener"].includes(member.name.text);
  const name = event && ts.isStringLiteral(event) ? event.text : undefined;
  const returning = host === "window" ? name === "focus" : name === "visibilitychange";
  if (!listener || !(returning || host === "window" && name === "beforeunload")) return [{ name: "foreign browser event", node: member }];
  if (options.length || !handler) return [{ name: "opaque browser event options", node: member }];
  return returning ? returnProblems(code, handler) : unloadProblems(code, handler);
}

/** Each use of window, history, location or document in the session module beyond its one capability. */
export function browserHostProblems(code: RuntimeCode): readonly RuntimeUse[] {
  const found: RuntimeUse[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && browserHostGlobals.has(node.text) && !code.checker.getSymbolAtLocation(node)?.valueDeclaration) {
      const member = node.parent, call = member.parent;
      if (!ts.isPropertyAccessExpression(member) || member.expression !== node) found.push({ name: "opaque browser host access", node });
      else if (node.text === "location") {
        if (!["hash", "pathname", "search"].includes(member.name.text) || isAssignment(call, member)) found.push({ name: "foreign location access", node });
      } else if (node.text === "document" && member.name.text === "visibilityState") {
        if (isAssignment(call, member) || ts.isCallExpression(call) && call.expression === member) found.push({ name: "foreign document access", node });
      } else if (!ts.isCallExpression(call) || call.expression !== member) found.push({ name: "escaped browser host capability", node });
      else if (node.text === "history") {
        if (member.name.text !== "replaceState") found.push({ name: "foreign history access", node });
      } else found.push(...listenerProblems(code, node.text, member, call));
    }
    ts.forEachChild(node, visit);
  };
  visit(code.file);
  return found;
}
