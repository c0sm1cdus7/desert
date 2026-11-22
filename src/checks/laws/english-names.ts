// Every code name is English outside the catalog's texts, and DESERT's retired Spanish names never return.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { field, isRecord } from "../../fields/json-values.ts";
import { filesUnder, fromRoot, lintFiles, parsed, type Repository } from "./law-files.ts";

/** The law's fixture: the inventory's Spanish words, and DESERT's retired API names, wire names and codes. */
const fixture: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "spanish-names.json"), "utf8"));
const list = (key: string): readonly string[] => {
  const value = field(fixture, key);
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
};
const words: ReadonlySet<string> = new Set(list("words"));
const retired: ReadonlySet<string> = new Set([...list("api"), ...list("wire"), ...list("diagnostics")]);
const codes: ReadonlySet<string> = new Set(list("diagnostics"));
export type NameOptions = Readonly<{ catalog: readonly string[] }>;

/** The words of a name, in lower case: camelCase, snake_case, kebab-case, dots and slashes apart. */
export const wordsOf = (name: string): string[] =>
  name
    .split(/[^\p{L}\p{N}]+/u)
    .flatMap(part => part.split(/(?<=\p{Ll})(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u))
    .filter(Boolean)
    .map(word => word.toLowerCase());
/** The Spanish words a name holds, from the law's own list. */
export const spanishWordsOf = (name: string): string[] => wordsOf(name).filter(word => words.has(word));
const idShaped = (text: string): boolean => /^[\p{L}\p{N}_.:/@#=*%+-]+$/u.test(text);
/** A retired name: a whole string, or a segment of an id-shaped one when it is a diagnostic code. */
export const retiredIn = (text: string): boolean =>
  retired.has(text) || (idShaped(text) && text.split(/[/:.@#=]/u).some(segment => codes.has(segment)));

const inCatalog = (path: string, catalog: readonly string[]): boolean =>
  catalog.some(entry => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));
const line = (source: ts.SourceFile, node: ts.Node): number =>
  source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
const isKey = (node: ts.Node): boolean =>
  (ts.isPropertyAssignment(node.parent) || ts.isPropertySignature(node.parent)) && node.parent.name === node;
/** What one file names in Spanish: identifiers and keys everywhere, retired strings outside the catalog. */
function fileNames(source: ts.SourceFile, path: string, catalog: boolean): string[] {
  const found: string[] = [];
  const say = (node: ts.Node, name: string) => found.push(`${path}:${String(line(source, node))}: ${name}`);
  const visit = (node: ts.Node): void => {
    if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && spanishWordsOf(node.text).length)
      say(node, node.text);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const key = isKey(node) && idShaped(node.text) && spanishWordsOf(node.text).length > 0;
      if (key || (!catalog && retiredIn(node.text))) say(node, node.text);
    }
    if (ts.isTemplateExpression(node) && !catalog)
      for (const part of [node.head, ...node.templateSpans.map(span => span.literal)])
        if (retiredIn(part.text)) say(part, part.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
/** Every name a repository gives in Spanish: in its code (`path:line: name`), its file and folder names (the path)
 * and its npm scripts (`package.json#scripts.name`). */
export function spanishNames(repo: Repository, options: NameOptions): string[] {
  const code = [...lintFiles(repo)].sort().flatMap(file => {
    const path = fromRoot(repo.root, file);
    return fileNames(parsed(file), path, inCatalog(path, options.catalog));
  });
  const files = filesUnder(repo.root, () => true)
    .map(file => fromRoot(repo.root, file))
    .filter(path => spanishWordsOf(path).length)
    .sort();
  const pkg: unknown = JSON.parse(readFileSync(join(repo.root, "package.json"), "utf8"));
  const scripts = field(pkg, "scripts");
  const named = isRecord(scripts) ? Object.keys(scripts) : [];
  return [
    ...code,
    ...files,
    ...named.filter(name => spanishWordsOf(name).length).map(name => `package.json#scripts.${name}`),
  ];
}
