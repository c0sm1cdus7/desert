import ts from "typescript";
import { dataContainer, dataElement, dataType, selectedTypes } from "./secret-data-types.ts";
import { iterationTypes, bindingOrigin } from "./secret-iteration.ts";
import { convertedValue } from "./secret-expression.ts";
interface Selection {
  key: ts.Expression;
  origin: ts.Node;
  containers: readonly ts.Type[];
  values: readonly ts.Type[];
}
/** Only an assignment pattern reads computed properties; an ordinary object literal creates them. */
export function assignmentOrigin(node: ts.ObjectLiteralExpression): ts.Expression | undefined {
  let current: ts.Node = node;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
  const parent = current.parent;
  if (
    ts.isBinaryExpression(parent) &&
    parent.left === current &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  )
    return parent.right;
  if (ts.isForOfStatement(parent) && parent.initializer === current) return parent.expression;
  if (ts.isPropertyAssignment(parent) && ts.isObjectLiteralExpression(parent.parent))
    return assignmentOrigin(parent.parent);
  return undefined;
}
function assignmentContainers(node: ts.ObjectLiteralExpression, checker: ts.TypeChecker): ts.Type[] {
  const parent = node.parent;
  if (ts.isForOfStatement(parent)) return iterationTypes(parent, checker);
  if (ts.isPropertyAssignment(parent) && ts.isObjectLiteralExpression(parent.parent)) {
    const key = parent.name;
    const type = ts.isComputedPropertyName(key)
      ? checker.getTypeAtLocation(key.expression)
      : checker.getStringLiteralType(key.text);
    return assignmentContainers(parent.parent, checker).flatMap(object => selectedTypes(object, type, checker));
  }
  const origin = assignmentOrigin(node);
  return origin ? [checker.getTypeAtLocation(origin)] : [];
}
function selection(node: ts.Node, checker: ts.TypeChecker): Selection | undefined {
  if (
    ts.isBindingElement(node) &&
    ts.isObjectBindingPattern(node.parent) &&
    node.propertyName &&
    ts.isComputedPropertyName(node.propertyName)
  ) {
    const key = node.propertyName.expression;
    const object = checker.getTypeAtLocation(node.parent);
    return {
      key,
      origin: bindingOrigin(node),
      containers: [object],
      values: selectedTypes(object, checker.getTypeAtLocation(key), checker),
    };
  }
  if (ts.isPropertyAssignment(node) && ts.isComputedPropertyName(node.name)) {
    const origin = assignmentOrigin(node.parent);
    if (!origin) return undefined;
    const key = node.name.expression;
    const containers = assignmentContainers(node.parent, checker);
    return {
      key,
      origin,
      containers,
      values: containers.flatMap(object => selectedTypes(object, checker.getTypeAtLocation(key), checker)),
    };
  }
  return undefined;
}
/** All computed reads share the same conversion, container and selected-value rule. */
export function selectionEscapes(node: ts.Node, checker: ts.TypeChecker): string[] {
  let read = selection(node, checker);
  if (ts.isElementAccessExpression(node))
    read = { key: node.argumentExpression, origin: node.expression, containers: [], values: [] };
  if (!read) return [];
  const found: string[] = [];
  if (convertedValue(read.origin, checker) || convertedValue(read.key, checker)) found.push("converted element access");
  if (ts.isStringLiteralLike(read.key) || ts.isNumericLiteral(read.key)) return found;
  const safe = ts.isElementAccessExpression(node)
    ? dataElement(node, checker)
    : read.containers.every(type => dataContainer(type, checker)) && read.values.every(type => dataType(type, checker));
  if (!safe) found.push("nonliteral element access outside data");
  return found;
}
