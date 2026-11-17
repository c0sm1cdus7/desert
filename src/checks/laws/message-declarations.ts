// Reconoce declaraciones de mensajes y delimita sus traducciones sin habilitar el resto del archivo.
import ts from "typescript";
export const propertyValue = (node: ts.Node | undefined, name: string): ts.Expression | undefined => {
  if (!node || !ts.isObjectLiteralExpression(node)) return undefined;
  const property = node.properties.find(
    item =>
      ts.isPropertyAssignment(item) &&
      (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
      item.name.text === name,
  );
  return property && ts.isPropertyAssignment(property) ? property.initializer : undefined;
};
export const literalValue = (node: ts.Node | undefined): string | undefined =>
  node && ts.isStringLiteralLike(node) ? node.text : undefined;
/** Only an imported message factory marks instructions; an arbitrary property named skill does not. */
export function messageDeclarations(source: ts.SourceFile): readonly ts.Expression[] {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!/(?:^|\/)fields\/messages\.ts$/.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements) {
      if ((binding.propertyName ?? binding.name).text === "defineMessage") names.add(binding.name.text);
    }
  }
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.has(node.expression.text)) {
      const argument = node.arguments[0];
      if (argument) found.push(argument);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
export const instructionTranslations = (source: ts.SourceFile): readonly ts.Node[] =>
  messageDeclarations(source).flatMap(declaration => {
    const kind = literalValue(propertyValue(declaration, "kind"));
    const texts = propertyValue(declaration, "texts");
    return kind && ["skill", "house", "mind"].includes(kind) && texts && ts.isObjectLiteralExpression(texts)
      ? [texts]
      : [];
  });
