// Rule C: the catalog index, manifest and types are derived from the declarations and nothing else.
// A hand edit, a missing file or a declaration changed without regenerating fails CATALOG_DERIVATION.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generateCatalog } from "../src/authoring/catalog/generate.ts";
import { readCatalogTree, runCatalogGate } from "../src/authoring/catalog/gate/run.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout();
const field = `import { defineFoundation } from "x";
import { FieldContract } from "./field.contract.ts";
export const Field = defineFoundation({ id: "field", purpose: "A field.", owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: FieldContract } as const);\n`;
const declarations: Readonly<Record<string, string>> = {
  "src/svelte/catalog/foundations/field/field.catalog.ts": field,
  "src/svelte/catalog/foundations/field/Field.svelte": "<input />\n",
  "src/svelte/catalog/compositions/sign-in-form/sign-in-form.catalog.ts": `import { defineComposition } from "x";
import { SignInFormContract } from "./sign-in-form.contract.ts";
export const SignInForm = defineComposition({ id: "sign-in-form", purpose: "Sign in.", owner: { entry: "SignInForm.svelte" },
  uses: ["field"], approval: "none", contract: SignInFormContract } as const);\n`,
  "src/svelte/catalog/compositions/sign-in-form/SignInForm.svelte": "<Field />\n",
  "src/svelte/catalog/mechanisms/theme/theme.mechanism.ts": `import { defineMechanism } from "x";
export const Theme = defineMechanism({ id: "theme", owner: "theme", files: ["tokens.css"] } as const);\n`,
};

async function withTree(files: Readonly<Record<string, string>>, check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-catalog-generate-"));
  try {
    for (const [path, source] of Object.entries(files)) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), source); }
    await check(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function generatedFor(files: Readonly<Record<string, string>>) {
  let outputs: readonly { path: string; source: string }[] = [];
  await withTree(files, async root => { outputs = generateCatalog((await readCatalogTree(root, layout)).declarations, layout); });
  return Object.fromEntries(outputs.map(output => [output.path, output.source]));
}

test("the index exports every piece entry under its PascalCase name, in id order", async () => {
  const index = (await generatedFor(declarations))[layout.generated.index] ?? "";
  assert.match(index, /export \{ default as Field \} from "\.\/foundations\/field\/Field\.svelte";\nexport \{ default as SignInForm \} from "\.\/compositions\/sign-in-form\/SignInForm\.svelte";/);
  assert.doesNotMatch(index, /Theme/, "a mechanism draws through its owner, never through the index");
});

test("the manifest is the declarations as data, without the contract reference", async () => {
  const manifest = JSON.parse((await generatedFor(declarations))[layout.generated.manifest] ?? "{}");
  assert.equal(manifest.version, "desert.catalog-manifest/1");
  assert.deepEqual(Object.keys(manifest.pieces), ["field", "sign-in-form"]);
  assert.deepEqual(manifest.pieces["sign-in-form"], { kind: "composition", folder: "src/svelte/catalog/compositions/sign-in-form",
    purpose: "Sign in.", owner: { entry: "SignInForm.svelte" }, uses: ["field"], approval: "none" });
  assert.deepEqual(manifest.mechanisms.theme, { folder: "src/svelte/catalog/mechanisms/theme", owner: "theme", files: ["tokens.css"] });
});

test("the types name every piece id and type props from its entry", async () => {
  const types = (await generatedFor(declarations))[layout.generated.types] ?? "";
  assert.match(types, /export type CatalogId = "field" \| "sign-in-form";/);
  assert.match(types, /"sign-in-form": typeof Catalog\.SignInForm;/);
  assert.match(types, /export type CatalogProps<Id extends CatalogId> = ComponentProps<CatalogExports\[Id\]>;/);
  assert.match(types, /export type CatalogSpecimen<Id extends CatalogId> = Readonly<\{ state: string; variants\?: Readonly<Record<string, string>>; props: CatalogProps<Id> \}>;/);
});

async function generatedTree(edit: (files: Record<string, string>) => void = () => {}) {
  const files: Record<string, string> = { ...declarations, ...await generatedFor(declarations) };
  edit(files);
  return files;
}

test("a tree whose generated files match its declarations passes rule C", async () => {
  await withTree(await generatedTree(), root => runCatalogGate(root, { layout, rules: ["C"] }).then(() => undefined));
});

test("formatting and comments in a generated file are immaterial", async () => {
  await withTree(await generatedTree(files => { files[layout.generated.index] = `// edited comment\n${files[layout.generated.index]!.replaceAll("; ", ";  ")}`; }),
    root => runCatalogGate(root, { layout, rules: ["C"] }).then(() => undefined));
});

for (const [name, edit] of [
  ["a hand-added export in the index", (files: Record<string, string>) => { files[layout.generated.index] += 'export { default as Rogue } from "./Rogue.svelte";\n'; }],
  ["a missing manifest", (files: Record<string, string>) => { delete files[layout.generated.manifest]; }],
  ["a declaration changed without regenerating", (files: Record<string, string>) => {
    files["src/svelte/catalog/foundations/field/field.catalog.ts"] = field.replace('states: ["empty"]', 'states: ["empty", "invalid"]'); }],
] as const) test(`${name} fails rule C`, async () => {
  await withTree(await generatedTree(edit), async root => {
    await assert.rejects(runCatalogGate(root, { layout, rules: ["C"] }), /CATALOG_DERIVATION: src\/svelte\/catalog\/(index\.ts|manifest\.json)/);
  });
});
