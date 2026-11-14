import ts from "typescript";
const opaque = ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive;
/** Judge the selected value itself: methods and nested functions do not make an object callable. */
export function dataType(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.flags & opaque) return false;
  if (type.getCallSignatures().length || type.getConstructSignatures().length) return false;
  const constraint = checker.getBaseConstraintOfType(type);
  if (constraint && constraint !== type) return dataType(constraint, checker);
  if (type.isUnion()) return type.types.every(part => dataType(part, checker));
  if (type.flags & (ts.TypeFlags.TypeParameter | ts.TypeFlags.IndexedAccess)) return false;
  if (type.flags & ts.TypeFlags.Object)
    return type.isClass() || type.getProperties().length > 0 || checker.getIndexInfosOfType(type).length > 0;
  return true;
}
/** Ambient singleton objects (Math, JSON, namespaces) differ from instances such as Date or Map. */
function ambient(type: ts.Type, checker: ts.TypeChecker): boolean {
  const symbol = type.getSymbol();
  if (!symbol) return false;
  const global = checker.resolveName(symbol.name, undefined, ts.SymbolFlags.Value, false);
  return (
    !!global?.declarations?.every(node => node.getSourceFile().isDeclarationFile) &&
    checker.getTypeOfSymbol(global) === type
  );
}
export function dataContainer(type: ts.Type, checker: ts.TypeChecker): boolean {
  const constraint = checker.getBaseConstraintOfType(type);
  if (constraint && constraint !== type) return dataContainer(constraint, checker);
  if (type.isUnion()) return type.types.every(part => dataContainer(part, checker));
  return (
    !!(type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection | ts.TypeFlags.StringLike)) &&
    !(type.flags & opaque) &&
    !type.getCallSignatures().length &&
    !type.getConstructSignatures().length &&
    !ambient(type, checker)
  );
}
/** Optional continuation removes only the null from the preceding chain, not null in the selected value. */
export function dataElement(node: ts.ElementAccessExpression, checker: ts.TypeChecker): boolean {
  const raw = checker.getTypeAtLocation(node.expression);
  const object = ts.isOptionalChain(node) ? checker.getNonNullableType(raw) : raw;
  return dataContainer(object, checker) && dataType(checker.getTypeAtLocation(node), checker);
}
/** Use key literals first, so unrelated methods and index signatures do not widen the chosen value. */
export function selectedTypes(object: ts.Type, key: ts.Type, checker: ts.TypeChecker): ts.Type[] {
  const container = checker.getBaseConstraintOfType(object) ?? object;
  const index = checker.getBaseConstraintOfType(key) ?? key;
  if (container.isUnion()) return container.types.flatMap(part => selectedTypes(part, index, checker));
  if (index.isUnion()) return index.types.flatMap(part => selectedTypes(container, part, checker));
  if (index.isStringLiteral() || index.isNumberLiteral()) {
    const property = checker.getPropertyOfType(container, String(index.value));
    if (property) return [checker.getTypeOfSymbol(property)];
  }
  if ("escapedName" in index && typeof index.escapedName === "string") {
    const property = container.getProperties().find(item => item.escapedName === index.escapedName);
    if (property) return [checker.getTypeOfSymbol(property)];
  }
  const numeric =
    !!(index.flags & ts.TypeFlags.NumberLike) ||
    (index.isStringLiteral() && String(Number(index.value)) === index.value);
  const numberIndex = numeric ? checker.getIndexTypeOfType(container, ts.IndexKind.Number) : undefined;
  const applicable = checker
    .getIndexInfosOfType(container)
    .find(info => checker.isTypeAssignableTo(index, info.keyType));
  const textIndex = numeric ? checker.getIndexTypeOfType(container, ts.IndexKind.String) : undefined;
  const value = numberIndex ?? applicable?.type ?? textIndex;
  return [value ?? checker.getUnknownType()];
}
