import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

/** Stylesheets a frozen theme imports that have since moved (its path → today's, relative to src/svelte). A frozen
 * theme's other imports read today's files, so a moved one is read at its new place. */
export const movedStylesheets: Readonly<Record<string, string>> = {
  "./catalog/compositions/place-heading/place-heading.css": "./catalog/foundations/place-heading/place-heading.css",
  "./catalog/foundations/scroll-edges/scroll-edges.css": "./catalog/foundations/surface/scroll-edges.css",
  "./catalog/mechanisms/catalog-shell/catalog-shell.css": "./catalog/foundations/shell/catalog-shell.css",
};

const relocated = (theme: string) => Object.entries(movedStylesheets)
  .reduce((text, [was, is]) => text.replaceAll(`@import "${was}";`, `@import "${is}";`), theme);

/** Compile the actual renderer's theme and source utilities, without a product/controller fixture.
 * `frozen` sources (a test's "before" copy of a file) contribute their own utilities, which the tree may no longer use;
 * `theme` is a frozen copy of theme.css, compiled in place of today's, its moved imports read at their new place. */
export async function rendererCss(frozen: readonly string[] = [], theme?: string): Promise<string> {
  const base = resolve(import.meta.dirname, "../../src/svelte");
  const source = theme === undefined ? await readFile(resolve(base, "theme.css"), "utf8") : relocated(theme);
  const compiler = await compile(source, { base, onDependency: () => {} });
  const scanner = new Scanner({ sources: compiler.sources });
  return compiler.build([...scanner.scan(), ...scanner.scanFiles(frozen.map(content => ({ content, extension: "svelte" })))]);
}
