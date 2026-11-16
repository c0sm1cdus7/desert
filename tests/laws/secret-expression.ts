import ts from "typescript";
const assignments = new WeakMap<ts.TypeChecker, Map<ts.SourceFile, Map<ts.Symbol, ts.Expression[]>>>();
const calls = new WeakMap<ts.TypeChecker, Map<ts.Node, ts.CallExpression[]>>();
const programs = new WeakMap<
  ts.TypeChecker,
  { sources: ts.SourceFile[]; files: Set<string>; hasConversions: boolean }
>();
export function trackConversions(program: ts.Program, files = new Set(program.getRootFileNames())): void {
  const sources = program.getSourceFiles().filter(source => files.has(source.fileName));
  let hasConversions = false;
  const visit = (node: ts.Node): void => {
    if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && node.type.getText() !== "const")
      hasConversions = true;
    ts.forEachChild(node, visit);
  };
  sources.forEach(visit);
  programs.set(program.getTypeChecker(), { sources, files, hasConversions });
  calls.delete(program.getTypeChecker());
}
function callInputs(parameter: ts.ParameterDeclaration, checker: ts.TypeChecker): ts.Expression[] {
  let indexed = calls.get(checker);
  if (!indexed) {
    indexed = new Map<ts.Node, ts.CallExpression[]>();
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const declaration = checker.getResolvedSignature(node)?.declaration;
        if (declaration && !declaration.getSourceFile().isDeclarationFile)
          indexed?.set(declaration, [...(indexed.get(declaration) ?? []), node]);
      }
      ts.forEachChild(node, visit);
    };
    for (const source of programs.get(checker)?.sources ?? []) if (!source.isDeclarationFile) visit(source);
    calls.set(checker, indexed);
  }
  const position = parameter.parent.parameters.indexOf(parameter);
  return (indexed.get(parameter.parent) ?? []).flatMap(call => {
    const argument = call.arguments[position];
    return argument ? [argument] : [];
  });
}
export function valueDeclarations(node: ts.Node, checker: ts.TypeChecker): readonly ts.Declaration[] {
  const symbol = checker.getSymbolAtLocation(node);
  if (!symbol) return [];
  return (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol).declarations ?? [];
}
function fileAssignments(source: ts.SourceFile, checker: ts.TypeChecker): Map<ts.Symbol, ts.Expression[]> {
  const files = assignments.get(checker) ?? new Map<ts.SourceFile, Map<ts.Symbol, ts.Expression[]>>();
  assignments.set(checker, files);
  const cached = files.get(source);
  if (cached) return cached;
  const values = new Map<ts.Symbol, ts.Expression[]>();
  const visit = (child: ts.Node): void => {
    if (ts.isBinaryExpression(child) && child.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const symbol = checker.getSymbolAtLocation(child.left);
      if (symbol) values.set(symbol, [...(values.get(symbol) ?? []), child.right]);
    }
    ts.forEachChild(child, visit);
  };
  visit(source);
  files.set(source, values);
  return values;
}
function assignedValues(node: ts.Identifier, checker: ts.TypeChecker): ts.Expression[] {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol
    ? valueDeclarations(node, checker).flatMap(
        declaration => fileAssignments(declaration.getSourceFile(), checker).get(symbol) ?? [],
      )
    : [];
}
function declarationValues(node: ts.Node): ts.Node[] {
  if (ts.isBindingElement(node)) {
    let parent: ts.Node = node.parent;
    while (ts.isObjectBindingPattern(parent) || ts.isArrayBindingPattern(parent) || ts.isBindingElement(parent))
      parent = parent.parent;
    return declarationValues(parent);
  }
  if (
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isPropertyDeclaration(node)
  )
    return node.initializer ? [node.initializer] : [];
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  )
    return node.body ? [node.body] : [];
  return [];
}
/** Standard scalar coercions produce their declared primitive regardless of assertions in their input. */
function scalarCoercion(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return false;
  if (!["String", "Number", "Boolean", "BigInt"].includes(node.expression.text)) return false;
  const declarations = checker.getSymbolAtLocation(node.expression)?.declarations ?? [];
  return (
    declarations.length > 0 &&
    declarations.every(declaration => /\/lib\.[^/]+\.d\.ts$/u.test(declaration.getSourceFile().fileName))
  );
}
/** Trace local/imported aliases, assignments and helper bodies; const assertions do not invent another type. */
export function convertedValue(node: ts.Node, checker: ts.TypeChecker, seen = new Set<ts.Node>()): boolean {
  const context = programs.get(checker);
  if (context && (!context.hasConversions || !context.files.has(node.getSourceFile().fileName))) return false;
  if (seen.has(node) || ts.isTypeNode(node)) return false;
  seen.add(node);
  if (scalarCoercion(node, checker)) return false;
  if (
    (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
    scalarCoercion(node.expression, checker) &&
    checker.getTypeAtLocation(node) === checker.getTypeAtLocation(node.expression)
  )
    return false;
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    if (node.type.getText() !== "const") return true;
  }
  const values: ts.Node[] = [];
  if (ts.isParameter(node)) values.push(...callInputs(node, checker));
  if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
    const declarations = valueDeclarations(node, checker);
    values.push(...declarations.flatMap(declarationValues));
    values.push(...declarations.flatMap(item => (ts.isParameter(item) ? callInputs(item, checker) : [])));
  }
  if (ts.isIdentifier(node)) values.push(...assignedValues(node, checker));
  if (ts.isCallExpression(node)) {
    const declaration = checker.getResolvedSignature(node)?.declaration;
    if (declaration && !declaration.getSourceFile().isDeclarationFile) values.push(...declarationValues(declaration));
  }
  node.forEachChild(child => {
    if (!ts.isTypeNode(child)) values.push(child);
  });
  return values.some(value => convertedValue(value, checker, seen));
}
/** Constant spelling is evidence too: string concatenation and aliases must not hide a reserved key. */
export function staticTexts(node: ts.Node, checker: ts.TypeChecker, seen = new Set<ts.Node>()): string[] {
  if (seen.has(node)) return [];
  seen.add(node);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node))
    return staticTexts(node.expression, checker, seen);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticTexts(node.left, checker, new Set(seen));
    const right = staticTexts(node.right, checker, new Set(seen));
    return left.flatMap(prefix => right.map(suffix => prefix + suffix));
  }
  if (ts.isIdentifier(node))
    return [...assignedValues(node, checker), ...valueDeclarations(node, checker).flatMap(declarationValues)].flatMap(
      value => staticTexts(value, checker, new Set(seen)),
    );
  return [];
}
