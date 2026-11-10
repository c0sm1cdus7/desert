import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export const root = resolve(import.meta.dirname, "../..");
export const src = join(root, "src");

/** Every file under a folder but what is no code: the installed packages and the hidden folders of the tooling. */
export function filesUnder(folder: string, accept: (path: string) => boolean = path => path.endsWith(".ts")): string[] {
  return readdirSync(folder).flatMap(name => {
    const path = join(folder, name);
    if (name === "node_modules" || name.startsWith(".")) return [];
    if (statSync(path).isDirectory()) return filesUnder(path, accept);
    return accept(path) ? [path] : [];
  });
}

export const isSpec = (path: string): boolean => path.endsWith(".spec.ts");
export const sourceFiles = (): string[] => filesUnder(src).filter(path => !isSpec(path));
export const fromRoot = (path: string): string => relative(root, path).split(sep).join("/");

export const parsed = (path: string): ts.SourceFile =>
  ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);

const isTypeOnly = (node: ts.ImportDeclaration | ts.ExportDeclaration): boolean =>
  ts.isImportDeclaration(node) ? node.importClause?.phaseModifier === ts.SyntaxKind.TypeKeyword : node.isTypeOnly;

/** Every module specifier a file imports or re-exports, static or dynamic; with `values`, only what runs. */
export function importsOf(path: string, values = false): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    const isImport = ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
    const counts = isImport && !(values && isTypeOnly(node));
    if (counts && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier.text);
    }
    const isDynamic = ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const [specifier] = isDynamic ? node.arguments : [];
    if (specifier && ts.isStringLiteral(specifier)) found.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(parsed(path));
  return found;
}

/** Every string a file's code holds: literals and the fixed parts of templates, never comments. */
export function stringsOf(path: string): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text);
    if (ts.isTemplateExpression(node)) found.push(node.head.text, ...node.templateSpans.map(span => span.literal.text));
    ts.forEachChild(node, visit);
  };
  visit(parsed(path));
  return found;
}

/** A text in words: at least two of them, apart. */
export const isProse = (text: string): boolean => (text.match(/\p{L}+/gu) ?? []).length >= 2 && /\s/.test(text);

/** An error thrown, or built to be: what it says is for whoever reads a failure, never for a model or for you. */
const isError = (node: ts.Node): boolean =>
  ts.isThrowStatement(node) || (ts.isNewExpression(node) && node.expression.getText().endsWith("Error"));

/** Every text in words a file's code holds (literals and the fixed parts of templates), but its errors'. */
export function proseOf(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (isError(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text);
    if (ts.isTemplateExpression(node)) found.push(node.head.text, ...node.templateSpans.map(span => span.literal.text));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found.filter(isProse);
}
