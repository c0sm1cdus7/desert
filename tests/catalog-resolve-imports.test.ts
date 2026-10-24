// Import resolution: an alias, a namespace, a barrel or a re-exported constant cannot hide which file defines a binding.
import assert from "node:assert/strict";
import test from "node:test";
import { contextOf } from "./support/catalog-context.ts";

const files = {
  "src/svelte/vendor/components/ui/button/button.svelte": "<button></button>\n",
  "src/svelte/vendor/components/ui/button/index.ts": 'import Root from "./button.svelte";\nexport { Root, Root as Button };\n',
  "src/svelte/catalog/index.ts": 'export { default as Heading } from "./foundations/heading/Heading.svelte";\nexport * from "./more.ts";\n',
  "src/svelte/catalog/more.ts": 'export { default as Field } from "./foundations/field/Field.svelte";\n',
  "src/svelte/catalog/foundations/heading/Heading.svelte": "<h1></h1>\n",
  "src/svelte/catalog/foundations/field/Field.svelte": "<input />\n",
  "src/svelte/typed-aliases.ts": 'import type { C } from "./c.ts";\nimport HeadingOwner from "./catalog/foundations/heading/Heading.svelte";\nexport const Title: C = HeadingOwner;\n',
  "src/svelte/catalog/compositions/page/Page.svelte": `<script lang="ts">
  import { Root as B } from "../../../vendor/components/ui/button/index.js";
  import * as Catalog from "../../index.ts";
  import { Field } from "../../index.ts";
  import { Title } from "@desert/svelte/typed-aliases.ts";
  import Missing from "./Missing.svelte";
  import { tick } from "svelte";
</script>\n`,
};
const page = "src/svelte/catalog/compositions/page/Page.svelte";

test("each binding resolves to the file that defines it", () => {
  const context = contextOf(files), imports = context.imports(page);
  const defined = (specifier: string, imported: string) => {
    const item = imports.find(candidate => candidate.specifier === specifier);
    assert.ok(item, specifier);
    return context.definition(item, imported);
  };
  assert.equal(defined("../../../vendor/components/ui/button/index.js", "Root"), "src/svelte/vendor/components/ui/button/button.svelte", ".js resolves to the .ts barrel");
  assert.equal(defined("../../index.ts", "*"), "src/svelte/catalog/index.ts", "a namespace is the module itself");
  assert.equal(defined("../../index.ts", "Field"), "src/svelte/catalog/foundations/field/Field.svelte", "export * is followed");
  assert.equal(defined("@desert/svelte/typed-aliases.ts", "Title"), "src/svelte/catalog/foundations/heading/Heading.svelte", "export const X = Owner follows Owner");
});

test("unresolved files and packages are named, not guessed", () => {
  const imports = contextOf(files).imports(page);
  assert.deepEqual(imports.find(item => item.specifier === "./Missing.svelte")?.target, { kind: "unresolved", specifier: "./Missing.svelte" });
  assert.deepEqual(imports.find(item => item.specifier === "svelte")?.target, { kind: "package", name: "svelte" });
});
