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
import { themeBlockBegin, themeBlockEnd } from "../src/authoring/catalog/theme-stylesheets.ts";

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
  await withTree(files, async root => { outputs = generateCatalog(await readCatalogTree(root, layout), layout); });
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
  assert.match(types, /export type CatalogProps<Id extends CatalogId> = CatalogPropsTable\[Id\];/);
  assert.match(types, /readonly "field": ComponentProps<typeof Catalog\.Field>;/, "a stub contract keeps the entry's props");
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

test("a closed contract types its piece from the contract, its events and its declared slots; a stub keeps the entry's props", async () => {
  const files = { ...declarations,
    "src/svelte/catalog/foundations/field/field.catalog.ts": field.replace('approval: "required"', 'slots: { accessory: { accepts: ["field"] } }, approval: "required"'),
    "src/svelte/catalog/foundations/field/field.contract.ts": `import { Type } from "@sinclair/typebox";
export const FieldContract = { props: Type.Object({ label: Type.String() }, { additionalProperties: false }),
  events: Type.Object({ change: Type.String() }, { additionalProperties: false }) } as const;\n` };
  const types = (await generatedFor(files))[layout.generated.types] ?? "";
  assert.match(types, /import type \{ FieldContract as FieldContract \} from "\.\/foundations\/field\/field\.contract\.ts";/);
  assert.match(types, /readonly "field": ContractProps<typeof FieldContract> & ContractEvents<typeof FieldContract> & \{ readonly "accessory"\?: Snippet \};/);
  assert.match(types, /readonly "sign-in-form": ComponentProps<typeof Catalog\.SignInForm>;/);
  assert.match(types, /export type ClosedContractId = "field";/);
});

test("the renderer table imports each rendering piece's entry and maps every kind it renders; the sources list every entry", async () => {
  const files = { ...declarations,
    "src/svelte/catalog/foundations/field/field.catalog.ts": field.replace('approval: "required"', 'renders: ["input.text", "input.multiline"], approval: "required"') };
  const generated = await generatedFor(files), table = generated[layout.generated.renderers] ?? "";
  assert.match(table, /^\/\/ Generated from the catalog declarations/);
  assert.match(table, /import type \{ NodeRendererTable \} from "\.\/renderer-contracts\.ts";\nimport Field from "\.\/catalog\/foundations\/field\/Field\.svelte";/);
  assert.match(table, /export const nodeRenderers: NodeRendererTable = Object\.freeze\(\{\n  "input\.text": Field,\n  "input\.multiline": Field,\n\} satisfies NodeRendererTable\);/);
  assert.doesNotMatch(table, /SignInForm/, "a piece that renders no kind is not in the table");
  assert.match(generated[layout.generated.sources] ?? "", /"sign-in-form": "src\/svelte\/catalog\/compositions\/sign-in-form\/SignInForm\.svelte",/);
});

test("a renderer table edited by hand fails rule C", async () => {
  await withTree(await generatedTree(files => { files[layout.generated.renderers] += "export const extra = 1;\n"; }), async root => {
    await assert.rejects(runCatalogGate(root, { layout, rules: ["C"] }), /CATALOG_DERIVATION: src\/svelte\/renderer-registry\.ts differs/);
  });
});

test("theme.css's stylesheet block is generated from the declarations; a hand edit to it fails rule C", async () => {
  const themed = testLayout({ fixed: { theme: ["src/svelte/theme.css"] } }), path = "src/svelte/theme.css";
  const files: Record<string, string> = { ...declarations,
    "src/svelte/catalog/foundations/field/field.catalog.ts": field.replace('owner: { entry: "Field.svelte" }', 'owner: { entry: "Field.svelte", parts: ["field.css"] }'),
    "src/svelte/catalog/foundations/field/field.css": "[data-field] { margin: 0; }\n",
    "src/svelte/catalog/mechanisms/motion/motion.mechanism.ts":
      'import { defineMechanism } from "x";\nexport const Motion = defineMechanism({ id: "motion", owner: "theme", files: ["motion.ts", "motion.css"] } as const);\n',
    "src/svelte/catalog/mechanisms/motion/motion.css": ".motion { opacity: 1; }\n",
    [path]: '@import "tailwindcss";\n@import "./catalog/mechanisms/theme/tokens.css";\n@source "./catalog";\n' };
  let generated: Record<string, string> = {};
  await withTree(files, async root => {
    generated = Object.fromEntries(generateCatalog(await readCatalogTree(root, themed), themed).map(output => [output.path, output.source]));
  });
  // Mechanisms first, then pieces; the theme mechanism's own stylesheets stay the entry's; a script file is not a stylesheet.
  assert.equal(generated[path], ['@import "tailwindcss";', '@import "./catalog/mechanisms/theme/tokens.css";', themeBlockBegin,
    '@import "./catalog/mechanisms/motion/motion.css";', '@import "./catalog/foundations/field/field.css";', themeBlockEnd, '@source "./catalog";', ""].join("\n"));
  await withTree({ ...files, ...generated }, root => runCatalogGate(root, { layout: themed, rules: ["C"] }).then(() => undefined));
  const edited = { ...files, ...generated, [path]: generated[path]!.replace('@import "./catalog/foundations/field/field.css";\n', "") };
  await withTree(edited, async root => {
    await assert.rejects(runCatalogGate(root, { layout: themed, rules: ["C"] }), /CATALOG_DERIVATION: src\/svelte\/theme\.css differs from the declarations/);
  });
});
