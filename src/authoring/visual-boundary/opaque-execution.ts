import ts from "typescript";

/** Nonvisual code cannot acquire an evaluator through a function's constructor
 * or reflection. This is a reviewed source boundary, not a hostile-JS sandbox. */
export function assertNoOpaqueExecution(file: ts.SourceFile, checker: ts.TypeChecker,
  fail: (reason: string) => never): void {
  function text(node: ts.Node | undefined, seen = new Set<ts.Node>()): string | undefined {
    if (!node || seen.has(node)) return;
    seen.add(node);
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return text(node.expression, seen);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = text(node.left, new Set(seen)), right = text(node.right, new Set(seen));
      return left !== undefined && right !== undefined ? left + right : undefined;
    }
    if (ts.isIdentifier(node)) {
      const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration)
        && ts.isVariableDeclarationList(declaration.parent)
        && declaration.parent.flags & ts.NodeFlags.Const) return text(declaration.initializer, seen);
    }
  }
  function visit(node: ts.Node): void {
    const member = ts.isPropertyAccessExpression(node) ? node.name.text
      : ts.isElementAccessExpression(node) ? text(node.argumentExpression)
      : ts.isBindingElement(node) && node.propertyName
        ? ts.isIdentifier(node.propertyName) ? node.propertyName.text
          : ts.isComputedPropertyName(node.propertyName) ? text(node.propertyName.expression) : text(node.propertyName)
        : undefined;
    if (member === "constructor" || member === "__proto__") fail("indirect runtime constructor");
    if (ts.isIdentifier(node) && node.text === "Reflect" && !checker.getSymbolAtLocation(node)?.valueDeclaration) {
      const parent = node.parent;
      if (!ts.isPropertyAccessExpression(parent) || parent.expression !== node || parent.name.text !== "ownKeys") {
        fail("opaque runtime reflection");
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "setTimeout"
      && text(node.arguments[0]) !== undefined) fail("executable timer string");
    ts.forEachChild(node, visit);
  }
  visit(file);
}
