import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

/** Compile the actual renderer's theme and source utilities, without a product/controller fixture.
 * `frozen` sources (a test's "before" copy of a file) contribute their own utilities, which the tree may no longer use;
 * `theme` is a frozen copy of theme.css, compiled in place of today's: an import it names that no longer exists fails the
 * compile, so a moved or deleted stylesheet is inlined at its frozen text (tests/fixtures/theme-before.ts), never read at its new place. */
export async function rendererCss(frozen: readonly string[] = [], theme?: string): Promise<string> {
  const base = resolve(import.meta.dirname, "../../src/svelte");
  const source = theme ?? await readFile(resolve(base, "theme.css"), "utf8");
  const compiler = await compile(source, { base, onDependency: () => {} });
  const scanner = new Scanner({ sources: compiler.sources });
  return compiler.build([...scanner.scan(), ...scanner.scanFiles(frozen.map(content => ({ content, extension: "svelte" })))]);
}
