// Rule G2, the post-build half of G. Law: every utility class in the emitted CSS is traceable to a source under
// foundations, mechanisms or vendor. Raises CROSS_OWNER_CSS. The build calls it after Vite, before the output is copied.
// Tailwind's own scanner reads each source of the context, as Tailwind did while building. Every class heading a rule of
// the emitted CSS is either written by a traceable source, hand-written as a rule in a source stylesheet (rule G's
// business), or one of Svelte's scoping classes; anything else is reported: on the non-owner sources that write it, or,
// when no source writes it at all (a plugin or transform injected it), on the emitted CSS itself.
// Svelte's scoping class is `svelte-<base36 hash of the component's file name>`; the file name is the build machine's,
// so the gate cannot recompute it. It bounds them instead: one per source holding a <style>, of the hash's shape.
import { posix } from "node:path";
import { Scanner } from "@tailwindcss/oxide";
import { walk, type SyntaxNode } from "./walk.ts";
import type { GateContext } from "./context.ts";
import { decodeCss, readStylesheet, rulesOf } from "./stylesheet.ts";
import type { Owner } from "./ownership.ts";
import { violation, type Violation } from "./violation.ts";

export type EmittedCss = Readonly<{ path: string; source: string }>;
const code = "CROSS_OWNER_CSS";
/** Svelte's default `cssHash`: `svelte-` and an unsigned 32-bit hash in base 36 (at most 7 characters). */
const scopingClass = /^svelte-[0-9a-z]{1,7}$/;

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

type ClassAt = Readonly<{ name: string; line: number }>;
function stylesheetClasses(path: string, css: string, read: (rule: SyntaxNode) => string[]): { classes: ClassAt[]; unreadable?: Violation } {
  const result = readStylesheet(path, css, 0, at => lineOf(css, at));
  if (result.kind === "unreadable") return { classes: [], unreadable: violation(code, path, result.line, `the emitted CSS does not parse: ${result.reason}`) };
  const { sheet } = result;
  return { classes: [...rulesOf(sheet.tree)].flatMap(rule => read(rule).map(name => ({ name, line: sheet.line(rule) }))) };
}

/** Candidates of the traceable sources, the non-traceable sources of every other candidate, hand-written classes, and
 * how many sources hold a Svelte <style> (each may add one scoping class). */
function sourceCandidates(context: GateContext) {
  const owned = new Set<string>(), foreign = new Map<string, string[]>(), handwritten = new Set<string>();
  let scoped = 0;
  for (const path of context.paths) {
    const text = context.text(path), owner = context.owners.of(path);
    if (text === undefined) continue;
    if (path.endsWith(".css") || path.endsWith(".svelte")) {
      const parsed = path.endsWith(".svelte") ? context.parsed(path) : undefined, css = parsed?.kind === "svelte" ? parsed.css : undefined;
      const content = css?.content, styles = typeof content === "object" && content !== null ? Reflect.get(content, "styles") : undefined;
      const sheet = path.endsWith(".css") ? text : typeof styles === "string" ? styles : "";
      if (css) scoped += 1;
      for (const { name } of stylesheetClasses(path, sheet, namedClasses).classes) handwritten.add(name);
      if (path.endsWith(".css")) continue;
    }
    for (const candidate of candidatesOf(path, text)) {
      if (traceable(owner)) owned.add(candidate);
      else foreign.set(candidate, [...foreign.get(candidate) ?? [], path]);
    }
  }
  return { owned, foreign, handwritten, scoped };
}

export function emittedCssViolations(input: Readonly<{ cssFiles: readonly EmittedCss[]; context: GateContext }>): readonly Violation[] {
  const { context } = input, { owned, foreign, handwritten, scoped } = sourceCandidates(context), found: Violation[] = [];
  const reported = new Set<string>(), scoping = new Set<string>();
  let excess: string | undefined;
  for (const file of input.cssFiles) {
    const { classes, unreadable } = stylesheetClasses(file.path, file.source, leadingClasses);
    if (unreadable) found.push(unreadable);
    for (const { name, line } of classes) {
      if (scopingClass.test(name)) { scoping.add(name); continue; }
      if (owned.has(name) || handwritten.has(name) || reported.has(name)) continue;
      reported.add(name);
      const writers = foreign.get(name) ?? [];
      if (!writers.length) found.push(violation(code, file.path, line, `utility class "${name}" is in the emitted CSS but no owner writes it: no source and no source stylesheet holds it`));
      for (const path of writers) {
        const text = context.text(path) ?? "";
        found.push(violation(code, path, lineOf(text, text.indexOf(name)), `utility class "${name}" reaches the emitted CSS only from `
          + `${describe(path, context.owners.of(path))}: no foundation, mechanism or vendor source uses it`));
      }
    }
    if (scoping.size > scoped) excess ??= file.path;
  }
  if (excess) found.push(violation(code, excess, 1, `the emitted CSS holds ${scoping.size} Svelte scoping classes but only ${scoped} sources hold a <style>`));
  return found;
}
