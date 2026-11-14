import ts from "typescript";
/** Follow inferred aliases, nested objects and return signatures, not names chosen for a resolver parameter. */
export function factoryLeaks(source: ts.SourceFile, checker: ts.TypeChecker, custody: ReadonlySet<string>): boolean {
  let leaked = false;
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const factory = checker.getTypeAtLocation(node).getProperty("open");
      const signatures = factory ? checker.getTypeOfSymbolAtLocation(factory, node).getCallSignatures() : [];
      leaked ||= signatures.some(signature => contains(checker.getReturnTypeOfSignature(signature), checker, custody));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return leaked;
}
export function contains(
  type: ts.Type,
  checker: ts.TypeChecker,
  custody: ReadonlySet<string>,
  seen = new Set<ts.Type>(),
): boolean {
  if (seen.has(type)) return false;
  seen.add(type);
  const declarations = [...(type.getSymbol()?.declarations ?? []), ...(type.aliasSymbol?.declarations ?? [])];
  if (declarations.some(node => custody.has(node.getSourceFile().fileName))) return true;
  if (type.isUnionOrIntersection()) return type.types.some(part => contains(part, checker, custody, seen));
  if (!(type.flags & ts.TypeFlags.Object)) return false;
  if (declarations.length && declarations.every(node => node.getSourceFile().isDeclarationFile)) {
    const arguments_ = [...(type.aliasTypeArguments ?? []), ...(reference(type) ? checker.getTypeArguments(type) : [])];
    return arguments_.some(part => contains(part, checker, custody, seen));
  }
  if (type.getCallSignatures().some(call => contains(checker.getReturnTypeOfSignature(call), checker, custody, seen)))
    return true;
  return type.getProperties().some(property => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    return declaration && contains(checker.getTypeOfSymbolAtLocation(property, declaration), checker, custody, seen);
  });
}

function reference(type: ts.Type): type is ts.TypeReference {
  return (
    type.isClassOrInterface() ||
    ("objectFlags" in type && typeof type.objectFlags === "number" && !!(type.objectFlags & ts.ObjectFlags.Reference))
  );
}
