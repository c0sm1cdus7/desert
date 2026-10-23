import ts from "typescript";
import type { Finding, VisualRole } from "./model.ts";
import { finding } from "./model.ts";
import { isPrivateVisualRequest } from "./source-request.ts";

const domOperations = new Set(["style", "classList", "className", "innerHTML", "outerHTML", "insertAdjacentHTML",
  "before", "after", "append", "prepend", "replaceWith", "remove", "insertAdjacentText", "textContent", "innerText", "nodeValue",
  "insertBefore", "replaceChild", "removeChild", "appendData", "deleteData", "insertData", "replaceData",
  "setAttribute", "removeAttribute", "setProperty", "animate", "querySelector", "querySelectorAll",
  "getElementById", "getElementsByClassName", "createElement", "createElementNS", "adoptedStyleSheets",
  "appendChild", "replaceChildren", "getBoundingClientRect", "scrollTo", "scrollIntoView", "focus"]);
export function inspectScript(path: string, source: string, script: string, offset: number, role: VisualRole) {
  const file = ts.createSourceFile(path, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const findings: Finding[] = [], imports: string[] = [];
  const add = (code: string, node: ts.Node) => findings.push(finding(path, source, code,
    node.getStart(file) + offset, node.end + offset));
  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)) {
      const name = node.moduleSpecifier.text;
      imports.push(name);
      if (role === "adapter" && isPrivateVisualRequest(name)) add("PRIVATE_VISUAL_IMPORT", node);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || ts.isIdentifier(node.expression) && node.expression.text === "require")) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteral(first)) {
        imports.push(first.text);
        if (role === "adapter" && isPrivateVisualRequest(first.text)) add("PRIVATE_VISUAL_IMPORT", node);
      }
      else add("DYNAMIC_VISUAL_IMPORT", node);
    }
    if (role !== "vendor-private" && ts.isIdentifier(node)
      && /^(HTML\w*Attributes|ComponentProps|Snippet)$/.test(node.text)) add("OPEN_COMPONENT_CONTRACT", node);
    if ((role === "adapter" || role === "data") && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))) {
      const property = ts.isPropertyAccessExpression(node) ? node.name.text
        : ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : undefined;
      if (property && domOperations.has(property)) add("RENDERER_DOM_ACCESS", node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { findings, imports };
}
