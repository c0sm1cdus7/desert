import ts from "typescript";
import { staticTexts } from "./secret-expression.ts";
const reserved = new Set(["constructor", "__proto__", "prototype"]);
function keyNames(node: ts.Node, checker: ts.TypeChecker): string[] {
  const texts = staticTexts(node, checker);
  const type = checker.getTypeAtLocation(node);
  const parts = type.isUnion() ? type.types : [type];
  return [...texts, ...parts.flatMap(part => (part.isStringLiteral() ? [part.value] : []))];
}
/** Only key positions are forbidden: ordinary public text may say constructor or prototype. */
export function forbiddenKeys(node: ts.Node, checker: ts.TypeChecker): string[] {
  let names: string[] = [];
  if (ts.isPropertyAccessExpression(node)) names = [node.name.text];
  if (ts.isElementAccessExpression(node)) names = keyNames(node.argumentExpression, checker);
  if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
    const key = node.propertyName ?? node.name;
    if (ts.isComputedPropertyName(key)) names = keyNames(key.expression, checker);
    else if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) names = [key.text];
  }
  return [...new Set(names.filter(name => reserved.has(name)))];
}
