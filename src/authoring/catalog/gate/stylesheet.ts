// Reads stylesheets for the CSS rules (G, G2): every `.css` file and every Svelte `<style>`, with Svelte's own CSS parser,
// placed at the lines of the file that holds them. Shared so both rules read CSS one way.
import { parse } from "svelte/compiler";
import type { SyntaxNode } from "../../visual-boundary/walk.ts";

const wrapper = "<style>";
export type Stylesheet = Readonly<{ path: string; tree: SyntaxNode; text: (node: unknown) => string; line: (node: unknown) => number;
  atRules: readonly Readonly<{ name: string; prelude: string; line: number }>[] }>;

export const isNode = (value: unknown): value is SyntaxNode => typeof value === "object" && value !== null && !Array.isArray(value);
export const nodes = (value: unknown): SyntaxNode[] => Array.isArray(value) ? value.filter(isNode) : [];
export const position = (node: unknown, key: "start" | "end") => isNode(node) && typeof node[key] === "number" ? node[key] : 0;
export const lineOf = (source: string) => (at: number) => source.slice(0, Math.max(0, at)).split("\n").length;

/** CSS text with its escapes resolved: `\\73` is `s`, `\\:` is `:`. */
export const decodeCss = (text: string) => text.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g,
  (_, hex: string | undefined, character: string | undefined) => hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : character ?? "");

/** One stylesheet read by Svelte's CSS parser; `offset` and `line` place its nodes in the file that holds it. */
export function readStylesheet(path: string, css: string, offset: number, line: (at: number) => number):
  Readonly<{ kind: "sheet"; sheet: Stylesheet } | { kind: "unreadable"; line: number; reason: string }> {
  const at = (wrapped: number) => line(offset + Math.min(css.length, Math.max(0, wrapped - wrapper.length)));
  let tree: SyntaxNode;
  try { tree = Object(parse(`${wrapper}${css}</style>`, { modern: true }).css); }
  catch (error) {
    const where = isNode(error) && Array.isArray(error.position) && typeof error.position[0] === "number" ? error.position[0] : 0;
    return { kind: "unreadable", line: at(where), reason: (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "" };
  }
  const text = (node: unknown) => css.slice(position(node, "start") - wrapper.length, position(node, "end") - wrapper.length);
  const atRules = nodes(tree.children).filter(node => node.type === "Atrule")
    .map(node => ({ name: String(node.name), prelude: String(node.prelude ?? ""), line: at(position(node, "start")) }));
  return { kind: "sheet", sheet: { path, tree, text, line: node => at(position(node, "start")), atRules } };
}

/** Every style rule of a sheet, nested ones included; keyframe selectors (`from`, `50%`) are not rules about elements. */
export function* rulesOf(parent: SyntaxNode): Generator<SyntaxNode> {
  for (const node of nodes(isNode(parent.block) ? parent.block.children : parent.children)) {
    if (node.type === "Rule") { yield node; yield* rulesOf(node); }
    else if (node.type === "Atrule" && !String(node.name).endsWith("keyframes")) yield* rulesOf(node);
  }
}
