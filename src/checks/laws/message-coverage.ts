// Requires explicit translations for every declared language in all of the code's messages and phrases.
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
const propertyName = (item: ts.ObjectLiteralElementLike): string | undefined =>
  ts.isPropertyAssignment(item) && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name))
    ? item.name.text
    : undefined;
/** Whether a language's words are there: any expression but an empty or blank string. */
const said = (value: ts.Expression | undefined): boolean =>
  !!value && !(ts.isStringLiteralLike(value) && !value.text.trim());
/** A phrase is an object whose every key is a language: it says its words in each one, none left out. */
const isPhraseNode = (node: ts.Node, declared: readonly string[]): node is ts.ObjectLiteralExpression =>
  ts.isObjectLiteralExpression(node) &&
  node.properties.length > 0 &&
  node.properties.map(propertyName).every(name => name !== undefined && declared.includes(name));
export function phraseCoverage(repo: Repository, declared: readonly string[] = languages): string[] {
  return codeFiles(repo)
    .filter(file => !isSpec(file))
    .flatMap(file => {
      const source = parsed(file);
      const found: string[] = [];
      const visit = (node: ts.Node): void => {
        if (isPhraseNode(node, declared)) {
          const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
          const missing = declared.filter(language => !said(propertyValue(node, language)));
          found.push(...missing.map(language => `${fromRoot(repo.root, file)}:${line + 1}:${language}`));
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      return found;
    });
}
