// Parses each visual source once per gate run. A Svelte file yields its template, its CSS and its scripts as
// TypeScript trees with the offset of each script in the file, so every rule reports the same line numbers.
import { parse } from "svelte/compiler";
import ts from "typescript";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";

export type Script = Readonly<{ file: ts.SourceFile; offset: number }>;
export type ParsedSvelte = Readonly<{ kind: "svelte"; source: string; fragment: SyntaxNode; css: SyntaxNode | undefined;
  scripts: readonly Script[]; line: (position: number) => number }>;
export type ParsedScript = Readonly<{ kind: "script"; source: string; scripts: readonly Script[]; line: (position: number) => number }>;
export type Parsed = ParsedSvelte | ParsedScript;

const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
const lineOf = (source: string) => (position: number) => source.slice(0, Math.max(0, position)).split("\n").length;
const tsFile = (path: string, text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function range(node: unknown): { start: number; end: number } | undefined {
  if (!node || typeof node !== "object") return undefined;
  const start = Reflect.get(node, "start"), end = Reflect.get(node, "end");
  return typeof start === "number" && typeof end === "number" ? { start, end } : undefined;
}

export function parseSource(path: string, source: string): Parsed {
  if (!path.endsWith(".svelte")) return Object.freeze({ kind: "script", source, scripts: [{ file: tsFile(path, source), offset: 0 }], line: lineOf(source) });
  const tree = parse(source, { modern: true });
  const scripts: Script[] = [];
  for (const block of [tree.module, tree.instance]) {
    const content = range(block?.content);
    if (content) scripts.push({ file: tsFile(path, source.slice(content.start, content.end)), offset: content.start });
  }
  const fragment: unknown = tree.fragment, css: unknown = tree.css;
  if (!isNode(fragment)) throw new Error(`CATALOG_DECLARATION: ${path}: no template`);
  return Object.freeze({ kind: "svelte", source, fragment, css: isNode(css) ? css : undefined,
    scripts: Object.freeze(scripts), line: lineOf(source) });
}

/** Line of a TypeScript node inside a parsed file. */
export const scriptLine = (parsed: Parsed, script: Script, node: ts.Node) => parsed.line(script.offset + node.getStart(script.file));
