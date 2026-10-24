// A catalog page mounted with frozen "before" sources in place of the tree's files (a piece a foundation absorbed, as it
// was), and the renderer's theme compiled over both, so a parity test measures the new piece against the old pixels.
import { resolve } from "node:path";
import { rendererCss } from "../fixtures/renderer-css.ts";
import { svelteBrowser } from "../fixtures/svelte-browser.ts";

const root = resolve(import.meta.dirname, "../..");

export async function mountedBefore(before: Readonly<Record<string, string>>, markup: string, script = "") {
  const overrides = Object.fromEntries(Object.entries(before).map(([path, source]) => [resolve(root, path), source]));
  return svelteBrowser(`<script lang="ts">\n  import * as Catalog from "@desert/svelte/catalog/index.ts";\n${script}\n</script>\n${markup}`, overrides, undefined,
    { initialCss: await rendererCss(Object.values(before)) });
}
