import assert from "node:assert/strict";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

const path = "src/svelte/catalog/renderer/view-product/ViewProduct.svelte";
const check = (source: string) => assertClosedVisualBoundaries([{ path, source }]);

test("sealed adapters reject stylesheet requests independently of extension, query, fragment or import syntax", () => {
  for (const extension of ["css", "less", "sass", "scss", "styl", "stylus", "pcss", "postcss", "sss"]) {
    for (const suffix of ["", "?audit", "?direct", "?inline", "?raw", "?url", "#theme", "?direct#theme"]) {
      const request = `../theme.${extension}${suffix}`;
      for (const statement of [`import "${request}";`, `import stylesheet from "${request}";`,
        `export { default as stylesheet } from "${request}";`, `export * from "${request}";`]) {
        assert.throws(() => check(`<script module>${statement}</script>`), /PRIVATE_VISUAL_IMPORT/, statement);
      }
      for (const expression of [`import("${request}")`, `require("${request}")`]) {
        const source = `<script>${expression};</script>`;
        assert.ok(inspectVisualSource(path, source).findings.some(item => item.code === "PRIVATE_VISUAL_IMPORT"), expression);
        assert.throws(() => check(source), /CLOSED_VISUAL_BOUNDARY/);
      }
    }
  }
  assert.doesNotThrow(() => check('<script>import { surface } from "../data.ts?metadata";</script>'));
});

test("a request suffix cannot disguise a private component or reopen a closed owner", () => {
  for (const suffix of ["?audit", "#component", "?svelte&type=script"]) {
    assert.throws(() => check(`<script>import Foreign from "../catalog/foundations/heading/Heading.svelte${suffix}";</script>`), /private component import/);
    assert.throws(() => assertClosedVisualBoundaries([{ path: "src/svelte/example.svelte", source:
      `<script>import Heading from "./catalog/foundations/heading/Heading.svelte${suffix}";</script><Heading class="foreign"/>`,
    }]), /presentation escape/);
    assert.throws(() => check(`<script>import { NodeRenderer } from "../adapter-catalog.ts${suffix}";</script><NodeRenderer {node}/>`), /component outside adapter catalog/);
  }
});
