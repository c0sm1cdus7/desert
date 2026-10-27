import ts from "typescript";
import { Components } from "../views/components.ts";

// Only installed, side-effect-free authoring constructors can run in product source.
export const authoringCalls = new Set([
  "objectType", "text", "integer", "enumeration", "principal", "file", "labels", "references", "namedReferences", "mediaReferences",
  "createCommand", "updateCommand", "fromInput", "literal", "actorId",
  "mutationJourney", "readJourney", "ownershipPolicy", "humanExposure", "agentExposure",
  "controllerRole", "capability", "view", "inputMask",
  "defineModule", "composeProduct", "moduleIndex",
  "publishObject", "viewPorts", "factReference", "viewOutput", "initializeInput", "chooseFile", "defineView",
  "activityInputs", "activityExperience", "messageCatalog",
]);
export type Scope = { bindings: Set<string>; calls: Map<string, string>; modules: Set<string>; roots: Set<ts.Node> };
const moduleCalls = new Set(["moduleIndex"]);
const componentCalls = new Set(Object.keys(Components));

export function declarationExpression(node: ts.Expression, scope: Scope, allowModule = false, composition = false): void {
  const check = (value: ts.Expression, module = false, root = false) => declarationExpression(value, scope, module, root);
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return;
  if (ts.isIdentifier(node)) {
    if (!scope.bindings.has(node.text)) throw new Error(`PRODUCT_UNKNOWN_BINDING: ${node.text}`);
    if (scope.modules.has(node.text) && !allowModule) throw new Error("MODULE_MANIFEST_ACCESS");
    return;
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    if (!ts.isTypeReferenceNode(node.type) || !ts.isIdentifier(node.type.typeName) || node.type.typeName.text !== "const") {
      throw new Error("PRODUCT_TYPE_ASSERTION_NOT_ALLOWED");
    }
    check(node.expression, allowModule, composition); return;
  }
  if (ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)
    || ts.isNonNullExpression(node)) { check(node.expression, allowModule, composition); return; }
  if (ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(node.operator)
    && ts.isNumericLiteral(node.operand)) return;
  if (ts.isArrayLiteralExpression(node)) {
    for (const value of node.elements) check(ts.isSpreadElement(value) ? value.expression : value, allowModule);
    return;
  }
  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) check(prop.expression);
      else if (ts.isShorthandPropertyAssignment(prop) && !prop.objectAssignmentInitializer) check(prop.name);
      else if (ts.isPropertyAssignment(prop) && !ts.isComputedPropertyName(prop.name)) {
        if (["__proto__", "constructor", "prototype"].includes(prop.name.getText().replaceAll(/["']/g, ""))) {
          throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
        }
        check(prop.initializer, composition && prop.name.getText().replaceAll(/["']/g, "") === "modules");
      } else throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
    }
    return;
  }
  if (ts.isPropertyAccessExpression(node)) {
    if (["constructor", "prototype", "__proto__"].includes(node.name.text) || node.questionDotToken) {
      throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
    }
    check(node.expression); return;
  }
  if (ts.isCallExpression(node)) {
    const target = node.expression;
    if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression)
      && scope.calls.get(target.expression.text) === "Components") {
      if (!componentCalls.has(target.name.text) || target.questionDotToken || node.questionDotToken) throw new Error("PRODUCT_CALL_NOT_ALLOWED");
      if (node.typeArguments?.length) throw new Error("PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED");
      node.arguments.forEach(argument => check(argument));
      return;
    }
    const name = ts.isIdentifier(node.expression) ? scope.calls.get(node.expression.text) : undefined;
    if (!name || !authoringCalls.has(name) || node.questionDotToken) throw new Error("PRODUCT_CALL_NOT_ALLOWED");
    if (node.typeArguments?.length) throw new Error("PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED");
    if (["composeProduct", "defineModule"].includes(name) && !scope.roots.has(node)) throw new Error("PRODUCT_ROOT_REQUIRED");
    node.arguments.forEach((argument, index) => check(argument, index === 0 && moduleCalls.has(name), name === "composeProduct"));
    return;
  }
  throw new Error(`PRODUCT_EXPRESSION_NOT_ALLOWED: ${ts.SyntaxKind[node.kind]}`);
}
