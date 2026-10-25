// The DESERT tree as the gate reads it, in memory, so a rule test can mutate one real file and see exactly what the
// mutation adds: the unmutated tree carries today's violations (Q1), and a test compares against them.
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createContext, type ContentRule, type GateContext } from "../../src/authoring/catalog/gate/context.ts";
import { parseSource, type Parsed } from "../../src/authoring/catalog/gate/parse.ts";
import { gateSourcePaths, readCatalogTree } from "../../src/authoring/catalog/gate/run.ts";
import { formatViolation, type Violation } from "../../src/authoring/catalog/gate/violation.ts";
import { DesertLayout } from "../../src/authoring/catalog/layout.ts";
import { readDeclarations } from "../../src/authoring/catalog/read-declaration.ts";

export const desertRoot = resolve(import.meta.dirname, "../..");
const tree = await readCatalogTree(desertRoot, DesertLayout);
const original = new Map<string, string>();
for (const path of gateSourcePaths(tree, DesertLayout)) {
  if (/\.(svelte|ts|js|mjs|css|json|html)$/.test(path)) original.set(path, await readFile(join(desertRoot, path), "utf8"));
}

/** The real tree's text of a file. */
export const realSource = (path: string) => {
  const source = original.get(path);
  if (source === undefined) throw new Error(`REAL_TREE: ${path} is not a loaded source`);
  return source;
};

/** One parse per (path, text) across every context a test builds: an unchanged file is parsed once. */
const parses = new Map<string, Parsed>();
const parse = (path: string, source: string) => {
  const key = `${path}\u0000${source}`, known = parses.get(key);
  if (known) return known;
  const value = parseSource(path, source);
  parses.set(key, value);
  return value;
};

/** The real tree with some files replaced or added (`changes`): a content-rule context, as the gate builds it. */
export function realContext(changes: Readonly<Record<string, string>> = {}): GateContext {
  const sources = new Map([...original, ...Object.entries(changes)]);
  const paths = [...new Set([...tree.paths, ...Object.keys(changes).filter(path => DesertLayout.roots.some(root => path.startsWith(`${root}/`)))])].sort();
  const declarations = tree.declarations.map(located => {
    const changed = changes[located.path];
    if (changed === undefined) return located;
    const [declaration] = readDeclarations(located.path, changed);
    return declaration ? { path: located.path, declaration } : located;
  });
  return createContext({ layout: DesertLayout, paths, declarations, ledger: tree.ledger, sources, parse, nonvisual: "unread", contractTypes: "unread" });
}

const key = (item: Violation) => `${item.code}\u0000${item.path}\u0000${item.what}`;
const baselines = new Map<ContentRule, Map<string, readonly Violation[]>>();

/** `CODE path:line: what` of each violation `rule` reports on the changed tree and not on the base tree (a multiset). The base
 * is the real tree, or the real tree with `base` applied: a test that replaces a whole file compares with that file emptied,
 * so a violation the old text already had is not mistaken for nothing new. */
export function added(rule: ContentRule, changes: Readonly<Record<string, string>>, base: Readonly<Record<string, string>> = {}): string[] {
  const known = baselines.get(rule) ?? new Map<string, readonly Violation[]>(), baseKey = JSON.stringify(Object.entries(base));
  const baseline = known.get(baseKey) ?? rule(realContext(base));
  known.set(baseKey, baseline);
  baselines.set(rule, known);
  const remaining = new Map<string, number>();
  for (const item of baseline) remaining.set(key(item), (remaining.get(key(item)) ?? 0) + 1);
  return rule(realContext({ ...base, ...changes })).filter(item => {
    const left = remaining.get(key(item)) ?? 0;
    if (left > 0) { remaining.set(key(item), left - 1); return false; }
    return true;
  }).map(formatViolation);
}

/** A real file with `anchor` replaced; fails loudly when the anchor is gone, so a mutation can never silently change nothing. */
export function mutated(path: string, anchor: string, replacement: string): Record<string, string> {
  const source = realSource(path);
  if (!source.includes(anchor)) throw new Error(`MUTATION_ANCHOR_MISSING: ${path}: ${anchor}`);
  return { [path]: source.replace(anchor, replacement) };
}
