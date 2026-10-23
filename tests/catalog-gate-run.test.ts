// The gate reads a real tree from disk: every file of every extension, declarations as data, symlinks refused.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runCatalogGate } from "../src/authoring/catalog/gate/run.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout();
const tree: Readonly<Record<string, string>> = {
  "src/svelte/catalog/foundations/field/field.catalog.ts": `import { defineFoundation } from "x";
import { FieldContract } from "./field.contract.ts";
export const Field = defineFoundation({ id: "field", purpose: "A field.", owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: FieldContract } as const);\n`,
  "src/svelte/catalog/foundations/field/field.contract.ts": "export const FieldContract = {};\n",
  "src/svelte/catalog/foundations/field/Field.svelte": "<input />\n",
  "src/svelte/catalog/mechanisms/theme/theme.mechanism.ts": `import { defineMechanism } from "x";
export const Theme = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);\n`,
  "src/svelte/catalog/mechanisms/theme/tokens.css": ":root {}\n",
  "src/svelte/infra/state.ts": "export const state = 1;\n",
};

async function withTree(extra: Readonly<Record<string, string>>, check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-catalog-run-"));
  try {
    for (const [path, source] of Object.entries({ ...tree, ...extra })) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), source);
    }
    await check(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("a declared tree passes rules A and B", () => withTree({}, async root => {
  await runCatalogGate(root, { layout, rules: ["A", "B"] });
}));

test("a stray file of any extension fails rule A", () => withTree({ "src/svelte/catalog/foundations/field/rogue.pcss": "a{}" }, async root => {
  await assert.rejects(runCatalogGate(root, { layout, rules: ["A"] }), /UNDECLARED_VISUAL_SOURCE: .*rogue\.pcss/);
}));

test("a malformed declaration file fails before any rule runs", () => withTree({
  "src/svelte/catalog/foundations/field/field.catalog.ts": "export const Field = defineFoundation(build());\n",
}, async root => {
  await assert.rejects(runCatalogGate(root, { layout, rules: ["A"] }), /CATALOG_DECLARATION: .*field\.catalog\.ts/);
}));

test("a symlink under a visual root is refused", () => withTree({}, async root => {
  await symlink(join(root, "src/svelte/infra/state.ts"), join(root, "src/svelte/infra/linked.ts"));
  await assert.rejects(runCatalogGate(root, { layout, rules: ["A"] }), /VISUAL_SOURCE_SYMLINK: .*linked\.ts/);
}));
