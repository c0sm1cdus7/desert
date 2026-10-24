// Rule A: every file under the visual roots belongs to exactly one declaration or one fixed category.
import assert from "node:assert/strict";
import test from "node:test";
import { assertDeclaredSources } from "../src/authoring/catalog/gate/inventory.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout({ fixed: { theme: ["src/svelte/theme.css"], documentation: ["src/svelte/vendor/LICENSE"] } });
const declaration = (path: string, source: string) => readDeclarations(path, source).map(item => ({ path, declaration: item }));
const field = declaration("src/svelte/catalog/foundations/field/field.catalog.ts", `import { defineFoundation } from "x";
import { FieldContract } from "./field.contract.ts";
export const Field = defineFoundation({ id: "field", purpose: "A field.", owner: { entry: "Field.svelte", parts: ["field.css"],
  vendor: ["input"] }, shape: "radius", states: ["empty"], approval: "required", contract: FieldContract } as const);`);
const pane = declaration("src/svelte/catalog/mechanisms/pane/pane.mechanism.ts", `import { defineMechanism } from "x";
export const Pane = defineMechanism({ id: "pane", owner: "theme", files: ["pane.css"] } as const);`);
const declared = [...field, ...pane];
const owned = [
  "src/svelte/catalog/foundations/field/field.catalog.ts", "src/svelte/catalog/foundations/field/field.contract.ts",
  "src/svelte/catalog/foundations/field/field.specimens.ts", "src/svelte/catalog/foundations/field/Field.svelte",
  "src/svelte/catalog/foundations/field/field.css", "src/svelte/vendor/components/ui/input/input.svelte",
  "src/svelte/vendor/components/ui/input/index.ts", "src/svelte/catalog/mechanisms/pane/pane.mechanism.ts",
  "src/svelte/catalog/mechanisms/pane/pane.css", "src/svelte/infra/appearance-state.ts", "src/svelte/theme.css",
  "src/svelte/vendor/LICENSE",
];

test("a tree whose every file is claimed once passes", () => {
  assert.doesNotThrow(() => assertDeclaredSources(owned, declared, layout));
});

test("every unclaimed file is named, whatever its extension", () => {
  const strays = ["src/svelte/pieces/Rogue.svelte", "src/svelte/catalog/foundations/field/rogue.pcss",
    "src/svelte/vendor/fonts/rogue.woff2", "src/svelte/vendor/components/ui/slider/slider.svelte", "src/svelte/infra/rogue.js"];
  assert.throws(() => assertDeclaredSources([...owned, ...strays], declared, layout), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /^UNDECLARED_VISUAL_SOURCE:/);
    for (const stray of strays) assert.ok(error.message.includes(stray), `${stray} must be named`);
    return true;
  });
});

test("a file claimed by two declarations is refused", () => {
  const twin = declaration("src/svelte/catalog/foundations/field/twin.catalog.ts", `import { defineFoundation } from "x";
import { C } from "./c.ts";
export const Twin = defineFoundation({ id: "twin", purpose: "A twin.", owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: C } as const);`);
  assert.throws(() => assertDeclaredSources(owned, [...declared, ...twin], layout), /CATALOG_DECLARATION: .*Field\.svelte.*field.*twin/);
});

test("a vendor family owned by two foundations is refused", () => {
  const other = declaration("src/svelte/catalog/foundations/search/search.catalog.ts", `import { defineFoundation } from "x";
import { C } from "./c.ts";
export const Search = defineFoundation({ id: "search", purpose: "A search.", owner: { entry: "Search.svelte", vendor: ["input"] },
  shape: "radius", states: ["empty"], approval: "required", contract: C } as const);`);
  assert.throws(() => assertDeclaredSources(owned, [...declared, ...other], layout), /CATALOG_DECLARATION: .*input.*field.*search/);
});

test("a vendor family folder holds only .svelte, .ts, .js, .css and .md files; another extension is unclaimed", () => {
  const legal = ["src/svelte/vendor/components/ui/input/press.js", "src/svelte/vendor/components/ui/input/input.css",
    "src/svelte/vendor/components/ui/input/module.md"];
  assert.doesNotThrow(() => assertDeclaredSources([...owned, ...legal], declared, layout));
  const strays = ["src/svelte/vendor/components/ui/input/input.scss", "src/svelte/vendor/components/ui/input/input.pcss",
    "src/svelte/vendor/components/ui/input/nested/glow.styl", "src/svelte/vendor/components/ui/input/README"];
  assert.throws(() => assertDeclaredSources([...owned, ...strays], declared, layout), error => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, `UNDECLARED_VISUAL_SOURCE: ${[...strays].sort().join(", ")}`);
    return true;
  });
});
