// The integration base ce6ed6f's theme.css for the slice 3 parity tests. Its imports read today's files, except those slice 3
// has since moved (F1f: the place heading's, the scroll edges' and the shell's) or deleted (F1d: the anchored surface's):
// those are inlined at their ce6ed6f text, so the frozen side compiles the true old pixels, never today's file at a new place.
import { contentBefore } from "./content-before.ts";
import { marksBefore } from "./marks-before.ts";
import { inlineImports } from "./parity.ts";

const goneSinceCe6ed6f = ["src/svelte/catalog/compositions/place-heading/place-heading.css",
  "src/svelte/catalog/foundations/scroll-edges/scroll-edges.css", "src/svelte/catalog/mechanisms/catalog-shell/catalog-shell.css",
  "src/svelte/catalog/mechanisms/anchored-surface/anchored-surface.css"];

const frozenText = (path: string) => {
  const text = contentBefore[path];
  if (text === undefined) throw new Error(`PARITY: no frozen ce6ed6f copy of ${path}`);
  return text;
};

/** ce6ed6f's theme.css with the moved and deleted stylesheets, and the `frozen` ones (paths from the repository root,
 * read from contentBefore), inlined at their ce6ed6f text. Throws when the theme does not import one of them. */
export function themeAtCe6ed6f(frozen: readonly string[] = []): string {
  const theme = marksBefore["src/svelte/theme.css"];
  if (theme === undefined) throw new Error("PARITY: no frozen ce6ed6f theme.css");
  return inlineImports(theme, Object.fromEntries([...goneSinceCe6ed6f, ...frozen].map(path => [path, frozenText(path)])));
}
