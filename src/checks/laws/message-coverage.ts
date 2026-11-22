// Requires explicit translations for every declared language in all of the code's messages.
import ts from "typescript";
import { languages } from "../../fields/languages.ts";
import { codeFiles, fromRoot, isSpec, parsed, type Repository } from "./law-files.ts";
import { literalValue, messageDeclarations, propertyValue } from "./message-declarations.ts";
const translated = (value: ts.Expression | undefined): boolean => {
  if (!value) return false;
  if (ts.isStringLiteralLike(value)) return value.text.trim().length > 0;
  if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) return true;
  return (
    ts.isBinaryExpression(value) &&
    value.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    translated(value.left) &&
    translated(value.right)
  );
};
export function messageCoverage(repo: Repository, declared: readonly string[] = languages): string[] {
  const seen = new Set<string>();
  return codeFiles(repo)
    .filter(file => !isSpec(file))
    .flatMap(file =>
      messageDeclarations(parsed(file)).flatMap(declaration => {
        const id = literalValue(propertyValue(declaration, "id"));
        const prefix = `${fromRoot(repo.root, file)}:${id ?? "id"}`;
        const texts = propertyValue(declaration, "texts");
        if (!id || !texts || !ts.isObjectLiteralExpression(texts)) return [`${prefix}:declaration`];
        const duplicate = seen.has(id) ? [`${prefix}:duplicate`] : [];
        seen.add(id);
        const indirect = texts.properties.some(
          item => !ts.isPropertyAssignment(item) || !(ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)),
        );
        return [
          ...duplicate,
          ...(indirect ? [`${prefix}:declaration`] : []),
          ...declared
            .filter(language => !translated(propertyValue(texts, language)))
            .map(language => `${prefix}:${language}`),
        ];
      }),
    );
}
