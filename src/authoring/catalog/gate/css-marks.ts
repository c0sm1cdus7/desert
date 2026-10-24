// Rule G, the half that reads what owners draw: a global stylesheet (a `.css` file) names only classes (as `.x` or as any
// `[class<op>=…]` pattern) and `data-*` marks its own owner writes in markup, and a custom property has one writer (the
// theme, when the theme writes it; each mechanism is its own writer), wherever it is written: CSS, a style attribute or
// directive, or `setProperty` in a script or template expression. A Svelte `<style>` block is scoped to its own markup,
// and `:global` there is reported by css-ownership.ts.
// Raises CROSS_OWNER_CSS.
import ts from "typescript";
import type { GateContext } from "./context.ts";
import { componentRuntime } from "./component-runtime.ts";
import type { Owner } from "./ownership.ts";
import type { Parsed } from "./parse.ts";
import { constantText } from "./runtime-globals.ts";
import { decodeCss, rulesOf, type Stylesheet } from "./stylesheet.ts";
import { violation, type Violation } from "./violation.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import { themeMechanism } from "../layout.ts";

const code = "CROSS_OWNER_CSS";
type Write = Readonly<{ path: string; line: number; owner: string }>;

/** The piece that owns a file, for CSS: a vendor family and a mechanism belong to their owner; theme.css to the theme. */
export function ownerId(owner: Owner | undefined): string | undefined {
  if (owner?.kind === "piece") return owner.id;
  if (owner?.kind === "vendor") return owner.foundation;
  if (owner?.kind === "mechanism") return owner.owner;
  return owner?.kind === "fixed" && owner.category === themeMechanism ? themeMechanism : undefined;
}
const writerOf = (context: GateContext, path: string) => ownerId(context.owners.of(path)) ?? path;

/** Static strings of an attribute value: its text parts and the string literals of its expressions. */
function strings(value: unknown): string[] {
  const found: string[] = [];
  walk(value, part => {
    if (part.type === "Text" && typeof part.data === "string") found.push(part.data);
    if (part.type === "Literal" && typeof part.value === "string") found.push(part.value);
    if (part.type === "TemplateElement") { const raw: unknown = Reflect.get(Object(part.value), "raw"); if (typeof raw === "string") found.push(raw); }
  });
  return found;
}

/** `.class` and `[data-x]` marks each owner writes in its templates (`data-slot` is the slots' law, in css-ownership.ts). */
function markupMarks(context: GateContext): ReadonlyMap<string, ReadonlySet<string>> {
  const marks = new Map<string, Set<string>>();
  const add = (mark: string, path: string) => marks.set(mark, (marks.get(mark) ?? new Set<string>()).add(writerOf(context, path)));
  for (const path of context.paths) {
    if (!path.endsWith(".svelte") || context.text(path) === undefined) continue;
    const parsed = context.parsed(path);
    if (parsed.kind === "svelte") walk(parsed.fragment, node => {
      const name = typeof node.name === "string" ? node.name : "";
      if (node.type === "Attribute" && name.startsWith("data-") && name !== "data-slot") add(`[${name}]`, path);
      if (node.type === "Attribute" && name === "class") for (const text of strings(node.value)) for (const token of text.split(/\s+/)) if (token) add(`.${token}`, path);
      if (node.type === "ClassDirective") add(`.${name}`, path);
    });
  }
  return marks;
}

/** Whether an element whose class attribute holds the class `token` can match `[class<matcher>"value"]`: the value is
 * matched against the whole attribute, so a value spanning several classes names each class it can be a piece of. */
export function classPatternMatches(matcher: string, value: string, insensitive: boolean, token: string): boolean {
  const fold = (text: string) => insensitive ? text.toLowerCase() : text;
  const wanted = fold(value), name = fold(token);
  if (wanted === "" || name === "") return false;
  const pieces = wanted.split(/\s+/);
  if (pieces.length === 1) {
    if (matcher === "=" || matcher === "~=") return name === wanted;
    if (matcher === "|=") return name === wanted || name.startsWith(`${wanted}-`);
    if (matcher === "^=") return name.startsWith(wanted);
    if (matcher === "$=") return name.endsWith(wanted);
    return matcher === "*=" && name.includes(wanted);
  }
  // A value with whitespace: `~=` never matches; elsewhere the inner pieces are whole classes and the outer ones may be cut.
  if (matcher === "~=") return false;
  const first = pieces[0] ?? "", last = pieces.at(-1) ?? "";
  if (pieces.slice(1, -1).includes(name)) return true;
  const firstMatches = first !== "" && (matcher === "$=" || matcher === "*=" ? name.endsWith(first) : name === first);
  const lastMatches = last !== "" && (matcher === "=" || matcher === "$=" ? name === last
    : matcher === "|=" ? name === last || name.startsWith(`${last}-`) : name.startsWith(last));
  return firstMatches || lastMatches;
}

/** The marks a selector part names: `.x`, `[data-x]`, and for `[class<op>=…]` every class written in markup that it matches. */
function partMarks(part: SyntaxNode, marks: ReadonlyMap<string, ReadonlySet<string>>): string[] {
  const name = decodeCss(String(part.name ?? ""));
  if (part.type === "ClassSelector") return [`.${name}`];
  if (part.type !== "AttributeSelector") return [];
  const attribute = name.toLowerCase();
  if (attribute.startsWith("data-")) return [`[${attribute}]`];
  if (attribute !== "class" || typeof part.matcher !== "string" || typeof part.value !== "string") return [];
  const matcher = part.matcher, value = decodeCss(part.value), insensitive = String(part.flags ?? "").toLowerCase() === "i";
  return [...marks.keys()].filter(mark => mark.startsWith(".") && classPatternMatches(matcher, value, insensitive, mark.slice(1)));
}

/** Classes and `data-*` marks of a `.css` file that only other owners write. `declared`: contract marks, judged by their contract. */
export function foreignMarkViolations(context: GateContext, sheets: readonly Stylesheet[], declared: ReadonlySet<string>): Violation[] {
  const marks = markupMarks(context), found: Violation[] = [];
  for (const sheet of sheets) {
    if (!sheet.path.endsWith(".css")) continue;
    const owner = writerOf(context, sheet.path);
    for (const rule of rulesOf(sheet.tree)) {
      const selector = sheet.text(rule.prelude).replace(/\s+/g, " ").trim(), reported = new Set<string>();
      walk(rule.prelude, part => {
        for (const mark of partMarks(part, marks)) {
          const writers = marks.get(mark);
          if (writers === undefined || writers.has(owner) || declared.has(mark) || reported.has(mark)) continue;
          reported.add(mark);
          found.push(violation(code, sheet.path, sheet.line(rule.prelude), `selector ${selector} names ${mark}, which only ${[...writers].sort().join(", ")} draws`));
        }
      });
    }
  }
  return found;
}

/** Who writes a custom property: each mechanism is its own writer (one owner may hold several), anything else its owner. */
function propertyWriter(context: GateContext, path: string): string {
  const owner = context.owners.of(path);
  return owner?.kind === "mechanism" ? `mechanism ${owner.id}` : writerOf(context, path);
}
const themeWriters = new Set([themeMechanism, `mechanism ${themeMechanism}`]);

type ScriptedWrite = Readonly<{ property: string; at: number }>;
/** Writes by file text: the same text always reads the same, so a file read again is not re-checked. */
const scriptedByText = new Map<string, readonly ScriptedWrite[]>();
/** Each `setProperty("--x")` of a file's runtime code: its scripts and every template expression, read in one scope, so
 * a constant name (`const name = "--x"`) resolves as it does when the file runs. */
function scriptedWrites(parsed: Parsed, path: string): readonly ScriptedWrite[] {
  const key = `${path}\u0000${parsed.source}`, known = scriptedByText.get(key);
  if (known) return known;
  const runtime = componentRuntime(parsed, path), found: ScriptedWrite[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const member = ts.isPropertyAccessExpression(callee) ? callee.name.text
        : ts.isElementAccessExpression(callee) ? constantText(runtime.checker, callee.argumentExpression) : undefined;
      const property = member === "setProperty" ? constantText(runtime.checker, node.arguments[0]) : undefined;
      if (property?.startsWith("--")) found.push({ property, at: runtime.position(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(runtime.file);
  scriptedByText.set(key, found);
  return found;
}

/** Every write of a custom property: CSS declarations, style attributes and directives, and `setProperty("--x")` in
 * scripts and template expressions. */
function customPropertyWrites(context: GateContext, sheets: readonly Stylesheet[]): Map<string, Write[]> {
  const writes = new Map<string, Write[]>();
  const add = (property: string, path: string, line: number) => writes.set(property, [...writes.get(property) ?? [], { path, line, owner: propertyWriter(context, path) }]);
  for (const sheet of sheets) walk(sheet.tree, node => {
    if (node.type === "Declaration" && String(node.property).startsWith("--")) add(decodeCss(String(node.property)), sheet.path, sheet.line(node));
  });
  for (const path of context.paths) {
    if (!/\.(svelte|ts|js)$/.test(path) || path.endsWith(".d.ts") || context.text(path) === undefined) continue;
    const parsed = context.parsed(path);
    if (parsed.kind === "svelte") walk(parsed.fragment, (node: SyntaxNode) => {
      const name = typeof node.name === "string" ? node.name : "";
      if (node.type === "StyleDirective" && name.startsWith("--")) add(name, path, parsed.line(node.start ?? 0));
      if (node.type === "Attribute" && name === "style") for (const text of strings(node.value)) {
        for (const match of decodeCss(text).matchAll(/(--[\w-]+)\s*:/g)) add(match[1] ?? "", path, parsed.line(node.start ?? 0));
      }
    });
    for (const write of scriptedWrites(parsed, path)) add(write.property, path, parsed.line(write.at));
  }
  return writes;
}

/** A custom property written by more than one writer: each write by a writer that is not the theme (when the theme writes it). */
export function customPropertyViolations(context: GateContext, sheets: readonly Stylesheet[]): Violation[] {
  const found: Violation[] = [];
  for (const [property, writes] of customPropertyWrites(context, sheets)) {
    const owners = [...new Set(writes.map(write => write.owner))].sort();
    if (owners.length < 2) continue;
    const canonical = owners.filter(owner => themeWriters.has(owner));
    for (const write of writes) if (!canonical.includes(write.owner)) {
      found.push(violation(code, write.path, write.line, `${write.owner} writes ${property}, which ${owners.filter(owner => owner !== write.owner).join(", ")} also writes: a custom property has one writing owner`));
    }
  }
  return found;
}
