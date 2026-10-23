import ts from "typescript";

/** A beforeunload event may cancel leaving, never recover Window through its
 * target, be forwarded to helpers, or escape into application state. */
export function assertUnloadCallback(file: ts.SourceFile, checker: ts.TypeChecker, expression: ts.Expression | undefined,
  fail: (reason: string) => never): void {
  let callback = expression;
  if (callback && ts.isIdentifier(callback)) {
    const declaration = checker.getSymbolAtLocation(callback)?.valueDeclaration;
    if (!declaration || declaration.getSourceFile() !== file || !ts.isVariableDeclaration(declaration)
      || !ts.isVariableDeclarationList(declaration.parent)
      || !(declaration.parent.flags & ts.NodeFlags.Const)) return fail("opaque unload callback");
    callback = declaration.initializer;
  }
  if (!callback || !ts.isArrowFunction(callback) || callback.parameters.length !== 1) return fail("opaque unload callback");
  const parameter = callback.parameters[0]!;
  if (!ts.isIdentifier(parameter.name) || parameter.initializer || parameter.dotDotDotToken) return fail("opaque unload event");
  const eventSymbol = checker.getSymbolAtLocation(parameter.name);
  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node) && checker.getSymbolAtLocation(node) === eventSymbol) {
      const member = node.parent;
      if (!ts.isPropertyAccessExpression(member) || member.expression !== node) return fail("escaped unload event");
      const operation = member.parent;
      const cancel = member.name.text === "preventDefault" && ts.isCallExpression(operation)
        && operation.expression === member && operation.arguments.length === 0;
      const legacyCancel = member.name.text === "returnValue" && ts.isBinaryExpression(operation)
        && operation.left === member && operation.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isStringLiteral(operation.right) && operation.right.text === "";
      if (!cancel && !legacyCancel) fail("foreign unload event capability");
    }
    ts.forEachChild(node, visit);
  }
  visit(callback.body);
}
