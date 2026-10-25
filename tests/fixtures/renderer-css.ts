import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { pruneBefore } from "./prune-before.ts";
import { prunedSourcesBefore } from "./pruned-sources-before.ts";
import { toolbarLayoutRulesBefore } from "./toolbar-layout-rules-before.ts";

/** A frozen theme's imports of stylesheets the base f7247e4 had, inlined at their f7247e4 text (prune-before.ts): lane M
 * deleted the shared mechanisms and moved their rules into their owners, and a frozen side keeps the base's pixels. */
export function inlineBaseStylesheets(theme: string): string {
  return theme.replace(/@import "\.\/([^"]+\.css)";\n?/g, (statement, path: string) => pruneBefore[`src/svelte/${path}`] ?? statement);
}

/** f7247e4's theme.css, every import inlined at its f7247e4 text: the renderer before lane M pruned it. */
export function themeBeforePrune(): string {
  const theme = pruneBefore["src/svelte/theme.css"];
  if (theme === undefined) throw new Error("PARITY: no frozen f7247e4 theme.css");
  // The spacing steps the third review added to the scale (79d8322's 10, 14, 22 and 28px, which today's compositions use
  // on both sides of a parity page) did not exist at f7247e4: the frozen theme carries them, nothing else changes.
  return inlineBaseStylesheets(theme)
    + "\n@theme { --spacing-cozy:.625rem; --spacing-near:.875rem; --spacing-airy:1.375rem; --spacing-ample:1.75rem; }\n";
}

/** Today's theme with the stylesheets Batch 3 deleted appended at their f7247e4 text: a page that renders frozen sources
 * beside today's pieces keeps the rules its frozen markup was drawn with (no live markup matches them: lane M deleted
 * only dead rules or moved them, unchanged in value, to their owners). */
function themeWithPruned(theme: string): string {
  const deleted = Object.entries(pruneBefore).filter(([path]) => path !== "src/svelte/theme.css" && !existsSync(resolve(import.meta.dirname, "../..", path)));
  return `${theme}\n${deleted.map(([, css]) => css).join("\n")}`;
}

/** Compile the actual renderer's theme and source utilities, without a product/controller fixture.
 * `frozen` sources (a test's "before" copy of a file) contribute their own utilities, which the tree may no longer use;
 * `theme` is a frozen copy of theme.css, compiled in place of today's: an import it names that no longer exists fails the
 * compile, so a moved or deleted stylesheet is inlined at its frozen text (tests/fixtures/theme-before.ts), never read at its
 * new place; the stylesheets the base f7247e4 had are read at their f7247e4 text (inlineBaseStylesheets). Without a frozen theme,
 * frozen sources bring the stylesheets Batch 3 deleted (themeWithPruned). `frozenRules` are rules a frozen page needs that
 * today's theme gives its owners' marks instead, compiled with today's theme (so they may apply today's utilities). */
export async function rendererCss(frozen: readonly string[] = [], theme?: string, frozenRules = ""): Promise<string> {
  const base = resolve(import.meta.dirname, "../../src/svelte");
  const today = theme === undefined ? await readFile(resolve(base, "theme.css"), "utf8") : undefined;
  const current = today === undefined ? undefined : `${today}\n${frozenRules}`;
  const source = current === undefined ? inlineBaseStylesheets(theme ?? "") : frozen.length ? themeWithPruned(current) : current;
  const compiler = await compile(source, { base, onDependency: () => {} });
  const scanner = new Scanner({ sources: compiler.sources });
  // A frozen theme or frozen sources may draw pieces Batch 3 deleted (svelte-browser.ts serves them from
  // prunedSourcesBefore): their utilities too.
  const sources = frozen.length || theme !== undefined ? [...frozen, ...Object.values(prunedSourcesBefore)] : frozen;
  const css = compiler.build([...scanner.scan(), ...scanner.scanFiles(sources.map(content => ({ content, extension: "svelte" })))]);
  // Today's theme no longer styles the deleted toolbar-layout's rows; frozen pages that mount it bring those rules here.
  return theme === undefined ? `${css}\n${toolbarLayoutRulesBefore}` : css;
}
