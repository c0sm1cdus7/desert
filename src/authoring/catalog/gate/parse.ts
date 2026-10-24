// Parses each visual source once per gate run. A Svelte file yields its template, its CSS and its scripts as
// TypeScript trees with the offset of each script in the file, so every rule reports the same line numbers.
import { parse } from "svelte/compiler";
import ts from "typescript";
import { isNode, type SyntaxNode } from "./walk.ts";

/** `module`: the `<script module>` block of a component; `lang`: its lang attribute ("ts" for TypeScript). */
export type Script = Readonly<{ file: ts.SourceFile; offset: number; module: boolean; lang: string | undefined }>;
export type ParsedSvelte = Readonly<{ kind: "svelte"; source: string; fragment: SyntaxNode; css: SyntaxNode | undefined;
  scripts: readonly Script[]; line: (position: number) => number }>;
export type ParsedScript = Readonly<{ kind: "script"; source: string; scripts: readonly Script[]; line: (position: number) => number }>;
export type Parsed = ParsedSvelte | ParsedScript;

/** The 1-based line of a position in a source. */
export const lineOf = (source: string) => (position: number) => source.slice(0, Math.max(0, position)).split("\n").length;
const tsFile = (path: string, text: string) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function range(node: unknown): { start: number; end: number } | undefined {
  if (!node || typeof node !== "object") return undefined;
  const start = Reflect.get(node, "start"), end = Reflect.get(node, "end");
  return typeof start === "number" && typeof end === "number" ? { start, end } : undefined;
}

/** The static `lang` attribute of a `<script>` block. */
function langOf(block: unknown): string | undefined {
  const attributes: unknown = isNode(block) ? block.attributes : undefined;
  for (const attribute of Array.isArray(attributes) ? attributes : []) {
    if (!isNode(attribute) || attribute.name !== "lang") continue;
    const value: unknown = attribute.value, first: unknown = Array.isArray(value) ? value[0] : undefined;
    if (isNode(first) && typeof first.data === "string") return first.data;
  }
  return undefined;
}

export function parseSource(path: string, source: string): Parsed {
  if (!path.endsWith(".svelte")) return Object.freeze({ kind: "script", source,
    scripts: [{ file: tsFile(path, source), offset: 0, module: true, lang: path.endsWith(".ts") ? "ts" : undefined }], line: lineOf(source) });
  let tree: ReturnType<typeof parse>;
  // A source the compiler cannot read is one the gate cannot judge: rule O's law, raised here, where reading fails.
  try { tree = parse(source, { modern: true }); }
  catch (error) { throw new Error(`OPAQUE_SOURCE: ${path}: the source does not parse: ${(error instanceof Error ? error.message : String(error)).split("\n")[0]}`); }
  const scripts: Script[] = [];
  for (const [block, module] of [[tree.module, true], [tree.instance, false]] as const) {
    const content = range(block?.content);
    if (content) scripts.push({ file: tsFile(path, source.slice(content.start, content.end)), offset: content.start, module, lang: langOf(block) });
  }
  const fragment: unknown = tree.fragment, css: unknown = tree.css;
  if (!isNode(fragment)) throw new Error(`CATALOG_DECLARATION: ${path}: no template`);
  return Object.freeze({ kind: "svelte", source, fragment, css: isNode(css) ? css : undefined,
    scripts: Object.freeze(scripts), line: lineOf(source) });
}

/** Line of a TypeScript node inside a parsed file. */
export const scriptLine = (parsed: Parsed, script: Script, node: ts.Node) => parsed.line(script.offset + node.getStart(script.file));
