import ts from "typescript";
function callResults(type: ts.Type | undefined, checker: ts.TypeChecker): ts.Type[] {
  return type?.getCallSignatures().map(signature => checker.getReturnTypeOfSignature(signature)) ?? [];
}
function yielded(type: ts.Type, checker: ts.TypeChecker): ts.Type[] {
  const awaited = checker.getAwaitedType(type) ?? type;
  if (awaited.isUnion()) return awaited.types.flatMap(part => yielded(part, checker));
  const done = awaited.getProperty("done"),
    value = awaited.getProperty("value");
  if (done && checker.getTypeOfSymbol(done) === checker.getTrueType()) return [];
  return value ? [checker.getTypeOfSymbol(value)] : [checker.getUnknownType()];
}
/** Read the iterator's yielded values, excluding its return value (which a for-of body never sees). */
export function iterationTypes(node: ts.ForOfStatement, checker: ts.TypeChecker): ts.Type[] {
  const object = checker.getTypeAtLocation(node.expression);
  const numeric = checker.getIndexTypeOfType(object, ts.IndexKind.Number);
  if (numeric) return [node.awaitModifier ? (checker.getAwaitedType(numeric) ?? numeric) : numeric];
  const methods = object
    .getProperties()
    .filter(property => /^__@(?:asyncIterator|iterator)@/u.test(property.getName()));
  const iterators = methods.flatMap(method => callResults(checker.getTypeOfSymbol(method), checker));
  const results = iterators.flatMap(iterator => {
    const next = iterator.getProperty("next");
    return callResults(next && checker.getTypeOfSymbol(next), checker);
  });
  return results.length ? results.flatMap(result => yielded(result, checker)) : [checker.getUnknownType()];
}
/** Follow the enclosing declaration so conversions in an iterable also reach its binding pattern. */
export function bindingOrigin(node: ts.BindingElement): ts.Node {
  let parent: ts.Node = node.parent;
  while (ts.isObjectBindingPattern(parent) || ts.isArrayBindingPattern(parent) || ts.isBindingElement(parent))
    parent = parent.parent;
  if (
    ts.isVariableDeclaration(parent) &&
    ts.isVariableDeclarationList(parent.parent) &&
    ts.isForOfStatement(parent.parent.parent)
  )
    return parent.parent.parent.expression;
  return parent;
}
