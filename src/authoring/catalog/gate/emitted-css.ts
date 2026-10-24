// Rule G2, the post-build half of G. Law: every utility class in the emitted CSS is traceable to a source under
// foundations, mechanisms or vendor. Raises CROSS_OWNER_CSS. The build calls it after Vite, before the output is copied.
// Tailwind's own scanner reads each source of the context, as Tailwind did while building; a utility the emitted CSS
// holds that only other sources (compositions, renderer, infra, the build host) write is CSS a non-owner caused.
// Classes written as rules in a source stylesheet are hand-written CSS, not utilities, and are rule G's business.
import { posix } from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import { walk, type SyntaxNode } from "../../visual-boundary/walk.ts";
import type { GateContext } from "./context.ts";
import { decodeCss, readStylesheet, rulesOf } from "./stylesheet.ts";
import type { Owner } from "./ownership.ts";
import { violation, type Violation } from "./violation.ts";

export type EmittedCss = Readonly<{ path: string; source: string }>;
const code = "CROSS_OWNER_CSS";

const traceable = (owner: Owner | undefined) => owner?.kind === "vendor" || owner?.kind === "mechanism"
  || owner?.kind === "piece" && owner.pieceKind === "foundation" || owner?.kind === "fixed" && owner.category === "vendor-shared";
const describe = (path: string, owner: Owner | undefined) => owner?.kind === "piece" ? `${owner.pieceKind} ${owner.id}`
  : owner?.kind === "infra" || owner?.kind === "generated" ? owner.kind : owner?.kind === "fixed" ? owner.category : path;
const lineOf = (source: string, at: number) => source.slice(0, Math.max(0, at)).split("\n").length;

/** Tailwind's candidates of one source, scanned alone: one scanner per file, because a scanner reports each candidate once. */
const candidatesOf = (path: string, content: string) =>
  new Scanner({}).scanFiles([{ content, extension: posix.extname(path).slice(1) }]);

/** The class that heads each compound of a rule: `.md\:flex` in `.md\:flex:is(:where(.group) *)`, not the `.group` it refers to. */
function leadingClasses(rule: SyntaxNode): string[] {
  const children = (node: unknown, key: string): unknown[] => {
    const value: unknown = typeof node === "object" && node !== null ? Reflect.get(node, key) : undefined;
    return Array.isArray(value) ? value : [];
  };
  return children(rule.prelude, "children").flatMap(complex => children(complex, "children")).flatMap(relative => children(relative, "selectors"))
    .flatMap(part => typeof part === "object" && part !== null && Reflect.get(part, "type") === "ClassSelector" ? [decodeCss(String(Reflect.get(part, "name")))] : []);
}
/** Every class a rule names, anywhere in its selector. */
function namedClasses(rule: SyntaxNode): string[] {
  const found: string[] = [];
  walk(rule.prelude, node => { if (node.type === "ClassSelector") found.push(decodeCss(String(node.name))); });
  return found;
}

function stylesheetClasses(path: string, css: string, read: (rule: SyntaxNode) => string[]): { classes: string[]; unreadable?: Violation } {
  const result = readStylesheet(path, css, 0, at => lineOf(css, at));
  if (result.kind === "unreadable") return { classes: [], unreadable: violation(code, path, result.line, `the emitted CSS does not parse: ${result.reason}`) };
  return { classes: [...rulesOf(result.sheet.tree)].flatMap(read) };
}

/** Candidates of the traceable sources, the first non-traceable sources of every other candidate, and hand-written classes. */
function sourceCandidates(context: GateContext) {
  const owned = new Set<string>(), foreign = new Map<string, string[]>(), handwritten = new Set<string>();
  for (const path of context.paths) {
    const text = context.text(path), owner = context.owners.of(path);
    if (text === undefined) continue;
    if (path.endsWith(".css") || path.endsWith(".svelte")) {
      const parsed = path.endsWith(".svelte") ? context.parsed(path) : undefined, css = parsed?.kind === "svelte" ? parsed.css : undefined;
      const content = css?.content, styles = typeof content === "object" && content !== null ? Reflect.get(content, "styles") : undefined;
      const sheet = path.endsWith(".css") ? text : typeof styles === "string" ? styles : "";
      for (const name of stylesheetClasses(path, sheet, namedClasses).classes) handwritten.add(name);
      if (path.endsWith(".css")) continue;
    }
    for (const candidate of candidatesOf(path, text)) {
      if (traceable(owner)) owned.add(candidate);
      else foreign.set(candidate, [...foreign.get(candidate) ?? [], path]);
    }
  }
  return { owned, foreign, handwritten };
}

export function emittedCssViolations(input: Readonly<{ cssFiles: readonly EmittedCss[]; context: GateContext }>): readonly Violation[] {
  const { context } = input, { owned, foreign, handwritten } = sourceCandidates(context), found: Violation[] = [], reported = new Set<string>();
  for (const file of input.cssFiles) {
    const { classes, unreadable } = stylesheetClasses(file.path, file.source, leadingClasses);
    if (unreadable) found.push(unreadable);
    for (const name of classes) {
      if (owned.has(name) || handwritten.has(name) || reported.has(name)) continue;
      reported.add(name);
      for (const path of foreign.get(name) ?? []) {
        const text = context.text(path) ?? "";
        found.push(violation(code, path, lineOf(text, text.indexOf(name)), `utility class "${name}" reaches the emitted CSS only from `
          + `${describe(path, context.owners.of(path))}: no foundation, mechanism or vendor source uses it`));
      }
    }
  }
  return found;
}
