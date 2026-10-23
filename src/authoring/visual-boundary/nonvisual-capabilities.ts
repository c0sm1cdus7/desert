import ts from "typescript";
import { assertUnloadCallback } from "./unload-capability.ts";

/** Nonvisual platform facilities. DOM, CSS, canvas, animation and host traversal
 * are deliberately absent. Private packages are not admitted by directory. */
export const nonvisualGlobals: ReadonlySet<string> = new Set([
  "structuredClone", "setTimeout", "clearTimeout", "performance", "fetch", "AbortSignal", "AbortController", "URLSearchParams",
]);
export const nonvisualPackages: ReadonlySet<string> = new Set([
  "svelte", "@sinclair/typebox", "@sinclair/typebox/value",
]);
export const browserSessionPath = "src/web/client/browser-session.ts";

/** A dependency on Svelte's lifecycle does not grant its mount/render APIs. */
export function assertNonvisualFrameworkImport(node: ts.ImportDeclaration | ts.ExportDeclaration,
  fail: (reason: string) => never): void {
  const names = new Set(["onMount", "onDestroy", "untrack", "tick"]);
  if (!ts.isImportDeclaration(node) || !node.importClause || node.importClause.name
    || !node.importClause.namedBindings || !ts.isNamedImports(node.importClause.namedBindings)) {
    return fail("opaque framework capability");
  }
  for (const entry of node.importClause.namedBindings.elements) {
    if (!names.has((entry.propertyName ?? entry.name).text)) fail("visual framework capability");
  }
}

/** The one host capability consumes a private launch invitation and protects
 * unsent drafts. It may not gain arbitrary Window/DOM access under that name. */
export function assertBrowserSessionCapability(file: ts.SourceFile, checker: ts.TypeChecker, fail: (reason: string) => never): void {
  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && ["window", "history", "location"].includes(node.text)) {
      const member = node.parent;
      if (!ts.isPropertyAccessExpression(member) || member.expression !== node) fail("opaque browser host access");
      if (node.text === "location") {
        if (!["hash", "pathname", "search"].includes(member.name.text)
          || ts.isBinaryExpression(member.parent) && member.parent.left === member
            && member.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
            && member.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) fail("foreign location access");
      } else {
        const call = member.parent;
        if (!ts.isCallExpression(call) || call.expression !== member) fail("escaped browser host capability");
        if (node.text === "history" && member.name.text !== "replaceState") fail("foreign history access");
        if (node.text === "window" && (!["addEventListener", "removeEventListener"].includes(member.name.text)
          || !call.arguments[0] || !ts.isStringLiteral(call.arguments[0])
          || call.arguments[0].text !== "beforeunload")) fail("foreign browser event");
        if (node.text === "window") {
          if (call.arguments.length !== 2) fail("opaque browser event options");
          assertUnloadCallback(file, checker, call.arguments[1], fail);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
}
