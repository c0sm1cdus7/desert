import ts from "typescript";
const opaque = ts.TypeFlags.Any | ts.TypeFlags.Unknown;
const scalar =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.BigIntLike |
  ts.TypeFlags.ESSymbolLike |
  ts.TypeFlags.Null |
  ts.TypeFlags.Never |
  ts.TypeFlags.Undefined;
/** Data is structural and recursive; standard library objects and class instances are not records. */
export function dataType(type: ts.Type, checker: ts.TypeChecker, seen = new Set<ts.Type>()): boolean {
  if (type.flags & opaque) return false;
  if (type.getCallSignatures().length || type.getConstructSignatures().length) return false;
  const constraint = checker.getBaseConstraintOfType(type);
  if (constraint && constraint !== type) return dataType(constraint, checker, new Set(seen));
  if (type.isUnionOrIntersection()) return type.types.every(part => dataType(part, checker, new Set(seen)));
  if (type.flags & scalar) return true;
  if (seen.has(type)) return true;
  seen.add(type);
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const element = checker.getIndexTypeOfType(type, ts.IndexKind.Number);
    return !!element && dataType(element, checker, new Set(seen));
  }
  if (!(type.flags & ts.TypeFlags.Object) || type.isClass()) return false;
  const declarations = type.getSymbol()?.declarations ?? [];
  if (
    declarations.some(
      node =>
        ts.isClassDeclaration(node) ||
        (ts.isInterfaceDeclaration(node) && /\/lib\.[^/]+\.d\.ts$/u.test(node.getSourceFile().fileName)),
    )
  )
    return false;
  const indexes = checker.getIndexInfosOfType(type);
  if (!indexes.every(index => dataType(index.type, checker, new Set(seen)))) return false;
  return type.getProperties().every(property => dataType(checker.getTypeOfSymbol(property), checker, new Set(seen)));
}
/** A primitive number is data, but it is not an indexable data container. Check the selected value separately. */
export function dataElement(node: ts.ElementAccessExpression, checker: ts.TypeChecker): boolean {
  const raw = checker.getTypeAtLocation(node.expression);
  const object = node.questionDotToken ? checker.getNonNullableType(raw) : raw;
  const container = checker.getBaseConstraintOfType(object) ?? object;
  const parts = container.isUnionOrIntersection() ? container.types : [container];
  return (
    parts.every(part => !!(part.flags & (ts.TypeFlags.Object | ts.TypeFlags.StringLike)) && dataType(part, checker)) &&
    dataType(checker.getTypeAtLocation(node), checker)
  );
}
