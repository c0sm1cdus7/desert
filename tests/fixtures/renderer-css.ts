import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { pruneBefore } from "./prune-before.ts";

/** A frozen theme's imports of stylesheets the base f7247e4 had, inlined at their f7247e4 text (prune-before.ts): lane M
 * deleted the shared mechanisms and moved their rules into their owners, and a frozen side keeps the base's pixels. */
export function inlineBaseStylesheets(theme: string): string {
  return theme.replace(/@import "\.\/([^"]+\.css)";\n?/g, (statement, path: string) => pruneBefore[`src/svelte/${path}`] ?? statement);
}

/** f7247e4's theme.css, every import inlined at its f7247e4 text: the renderer before lane M pruned it. */
export function themeBeforePrune(): string {
  const theme = pruneBefore["src/svelte/theme.css"];
  if (theme === undefined) throw new Error("PARITY: no frozen f7247e4 theme.css");
  return inlineBaseStylesheets(theme);
}

/** Compile the actual renderer's theme and source utilities, without a product/controller fixture.
 * `frozen` sources (a test's "before" copy of a file) contribute their own utilities, which the tree may no longer use;
 * `theme` is a frozen copy of theme.css, compiled in place of today's: an import it names that no longer exists fails the
 * compile, so a moved or deleted stylesheet is inlined at its frozen text (tests/fixtures/theme-before.ts), never read at its
 * new place; the stylesheets the base f7247e4 had are read at their f7247e4 text (inlineBaseStylesheets). */
export async function rendererCss(frozen: readonly string[] = [], theme?: string): Promise<string> {
  const base = resolve(import.meta.dirname, "../../src/svelte");
  const source = theme === undefined ? await readFile(resolve(base, "theme.css"), "utf8") : inlineBaseStylesheets(theme);
  const compiler = await compile(source, { base, onDependency: () => {} });
  const scanner = new Scanner({ sources: compiler.sources });
  return compiler.build([...scanner.scan(), ...scanner.scanFiles(frozen.map(content => ({ content, extension: "svelte" })))]);
}
