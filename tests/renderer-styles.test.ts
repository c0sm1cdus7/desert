import test from "node:test";
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "svelte/compiler";

test("renderer global style layers enter through one theme, never component-side CSS imports", () => {
  const directory = resolve(import.meta.dirname, "../src/svelte");
  const imports: { file: string; source: string }[] = [];
  for (const file of globSync("**/*.svelte", { cwd: directory })) {
    const component = parse(readFileSync(resolve(directory, file), "utf8"), { modern: true });
    for (const script of [component.instance, component.module]) {
      for (const statement of script?.content.body ?? []) {
        if (statement.type === "ImportDeclaration" && typeof statement.source.value === "string" &&
          statement.source.value.endsWith(".css")) imports.push({ file, source: statement.source.value });
      }
    }
  }
  // A standalone @layer components import can precede Tailwind's layer prelude
  // after bundling, allowing the base reset to erase all shared bank geometry.
  assert.deepEqual(imports, [
    { file: "HumanProduct.svelte", source: "./theme.css" },
    { file: "explorer/PublicCatalogProduct.svelte", source: "../theme.css" },
  ]);
});
