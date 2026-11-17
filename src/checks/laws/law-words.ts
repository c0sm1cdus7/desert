// Reads literal words and distinguishes prose from behavioral instructions.
import ts from "typescript";
import { parsed } from "./law-files.ts";

/** Every string a file's code holds: literals and the fixed parts of templates, never comments. */
export function stringsIn(source: ts.Node, omitted: readonly ts.Node[] = []): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (omitted.includes(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text);
    if (ts.isTemplateExpression(node)) found.push(node.head.text, ...node.templateSpans.map(span => span.literal.text));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export const stringsOf = (path: string): string[] => stringsIn(parsed(path));

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

/** Words that tell a model how to behave: only marked skill and system-layer translations may carry one. */
const normativeWords = [
  /\bdeb[eé]s\b/i,
  /\bten[eé]s que\b/i,
  /\btienes que\b/i,
  /\bnunca\b/i,
  /\bsiempre\b/i,
  /\bno hagas\b/i,
  /\b(?:sos|eres) un/i,
  /\byou are\b/i,
  /\byou must\b/i,
  /\bmust\b/i,
  /\bnever\b/i,
  /\balways\b/i,
  /\bshould\b/i,
  /\bdo not\b/i,
  /\bdon't\b/i,
];

export const isNormative = (text: string): boolean => normativeWords.some(word => word.test(text));
