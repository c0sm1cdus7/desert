import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const path = "src/build/svelte/template/src/routes/+layout.svelte";
const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const check = (source: string) => assertClosedVisualBoundaries([{ path, source }]);

test("the bootstrap admits only the canonical theme and SvelteKit-owned child slot", () => {
  assert.doesNotThrow(() => check(source));
  assert.doesNotThrow(() => check(`<!-- bootstrap, not another renderer -->\n${source}`));
  for (const changed of [
    source.replace('@desert/svelte/theme.css', './other.css'),
    source.replace('import "@desert/svelte/theme.css";', ''),
    source.replace('import "@desert/svelte/theme.css";', 'import "@desert/svelte/theme.css"; import "./other.css";'),
    source.replace('children: Snippet', 'children: Snippet; class?: string'),
    source.replace('children: Snippet', 'children: any'),
    source.replace('{ children }', '{ children, ...rest }'),
    source.replace('$props()', '$props<any>()'),
    source.replace('</script>', 'document.write("<div>Foreign UI</div>");</script>'),
    source.replace('</script>', 'const other = children;</script>').replace('{@render children()}', '{@render other()}'),
    source.replace('{@render children()}', '<main>{@render children()}</main>'),
    source.replace('{@render children()}', '{@render children()}<span>Extra text</span>'),
    source.replace('{@render children()}', '{@render children()} {@render children()}'),
    source.replace('{@render children()}', '{@html "<div>Foreign UI</div>"}'),
    source + '<style>:global(body) { color: red; }</style>',
    source + '<script module>export const arbitrary = true;</script>',
  ]) assert.throws(() => check(changed), /CLOSED_VISUAL_BOOTSTRAP/, changed);
});
