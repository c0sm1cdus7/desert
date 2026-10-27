import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import test from "node:test";
import { assertProductSource } from "../src/authoring/index.ts";

async function fixture(files: Record<string, string>, run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-source-test-"));
  try {
    for (const [name, source] of Object.entries(files)) {
      await mkdir(dirname(join(root, name)), { recursive: true });
      await writeFile(join(root, name), source);
    }
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}
const moduleSource = 'import { defineModule } from "desert-sdk/src/index.ts"; export const NotesModule = defineModule({id:"notes"});';

test("source gate accepts declarative composition and reports every checked source", async () => {
  await fixture({
    "void.product.ts": 'import { composeProduct, moduleIndex } from "desert-sdk/src/index.ts"; import { NotesModule } from "./modules/notes/notes.module.ts"; const Modules = moduleIndex([NotesModule]); export const Product = composeProduct({modules:Modules});',
    "modules/notes/notes.module.ts": moduleSource,
  }, async root => assert.deepEqual((await assertProductSource(root)).files,
    ["modules/notes/notes.module.ts", "void.product.ts"]));
});

const prohibited: [string, Record<string, string>, RegExp][] = [
  ["private module import", {"root.ts": 'import { Note } from "./modules/notes/note.object.ts";',
    "modules/notes/note.object.ts": 'export const Note = {id:"note"};'}, /PRIVATE_MODULE_IMPORT/],
  ["cross-module import", {"modules/tasks/tasks.module.ts": 'import { NotesModule } from "../notes/notes.module.ts";',
    "modules/notes/notes.module.ts": moduleSource}, /CROSS_MODULE_IMPORT/],
  ["private reexport", {"modules/notes/notes.module.ts": 'export { Note } from "./note.object.ts";',
    "modules/notes/note.object.ts": 'export const Note = {id:"note"};'}, /MODULE_PUBLIC_BOUNDARY/],
  ["private exported binding", {"modules/notes/notes.module.ts": 'export const Note = {id:"note"};'}, /MODULE_PUBLIC_BOUNDARY/],
  ["infrastructure import", {"root.ts": 'import { readFileSync } from "node:fs";'}, /PRODUCT_IMPORT_NOT_ALLOWED/],
  ["SDK private executor", {"root.ts": 'import { openLocalController } from "desert-sdk/src/local.ts";'}, /PRODUCT_IMPORT_NOT_ALLOWED/],
  ["import-time effect", {"root.ts": 'globalThis.alert("bad");'}, /PRODUCT_STATEMENT_NOT_ALLOWED/],
  ["callback", {"root.ts": 'export const handler = () => 1;'}, /PRODUCT_EXPRESSION_NOT_ALLOWED/],
  ["arbitrary call", {"root.ts": 'export const value = JSON.parse("{}");'}, /PRODUCT_CALL_NOT_ALLOWED/],
  ["dynamic import", {"root.ts": 'export const value = import("node:fs");'}, /PRODUCT_CALL_NOT_ALLOWED/],
  ["namespace escape", {"root.ts": 'import * as SDK from "desert-sdk/src/index.ts";'}, /PRODUCT_IMPORT_NOT_ALLOWED/],
  ["renderer in product", {"Button.svelte": '<button>Test</button>'}, /PRODUCT_FILE_NOT_ALLOWED/],
  ["CSS override", {"style.css": 'button {padding:0}'}, /PRODUCT_FILE_NOT_ALLOWED/],
  ["view depending on activity", {"views/home.view.ts": 'import { Journey } from "../journeys/home.journey.ts";',
    "journeys/home.journey.ts": 'export const Journey = {id:"home"};'}, /VIEW_ACTIVITY_IMPORT/],
  ["view depending on module", {"views/home.view.ts": 'import { NotesModule } from "../modules/notes/notes.module.ts";',
    "modules/notes/notes.module.ts": moduleSource}, /VIEW_ACTIVITY_IMPORT/],
  ["outer source import", {"root.ts": 'import { foreign } from "../outside.ts";'}, /PRODUCT_IMPORT_OUTSIDE_SOURCE/],
  ["global binding", {"root.ts": 'export const value = process.env;'}, /PRODUCT_UNKNOWN_BINDING/],
  ["constructor escape", {"root.ts": 'export const value = "".constructor;'}, /PRODUCT_EXPRESSION_NOT_ALLOWED/],
  ["SDK compilation in declarations", {"root.ts": 'import { compile } from "desert-sdk/src/index.ts"; export const value = compile({});'}, /PRODUCT_CALL_NOT_ALLOWED/],
  ["manifest private property", {"root.ts": 'import { NotesModule } from "./modules/notes/notes.module.ts"; export const stolen = NotesModule.objects;',
    "modules/notes/notes.module.ts": moduleSource}, /MODULE_MANIFEST_ACCESS/],
  ["manifest alias", {"root.ts": 'import { NotesModule } from "./modules/notes/notes.module.ts"; const alias = NotesModule; export const stolen = alias.objects;',
    "modules/notes/notes.module.ts": moduleSource}, /MODULE_MANIFEST_ACCESS/],
  ["manifest clone", {"root.ts": 'import { NotesModule } from "./modules/notes/notes.module.ts"; export const stolen = {...NotesModule};',
    "modules/notes/notes.module.ts": moduleSource}, /MODULE_MANIFEST_ACCESS/],
  ["noncanonical module entry", {"root.ts": 'import { Private } from "./modules/notes/private.module.ts";',
    "modules/notes/private.module.ts": moduleSource}, /MODULE_ENTRYPOINT_REQUIRED/],
  ["manifest bridge reexport", {"bridge.ts": 'export { NotesModule } from "./modules/notes/notes.module.ts";',
    "root.ts": 'import { NotesModule } from "./bridge.ts"; export const stolen = NotesModule.objects;',
    "modules/notes/notes.module.ts": moduleSource}, /MODULE_MANIFEST_ACCESS/],
  ["indirect view activity dependency", {"views/home.view.ts": 'import { Label } from "../label.ts";',
    "label.ts": 'import { Journey } from "./home.journey.ts"; export const Label = Journey.id;',
    "home.journey.ts": 'export const Journey = {id:"home"};'}, /VIEW_ACTIVITY_IMPORT/],
  ["source cycle", {"first.ts": 'import { b } from "./second.ts"; export const a = b;',
    "second.ts": 'import { a } from "./first.ts"; export const b = a;'}, /PRODUCT_IMPORT_CYCLE/],
  ["missing product root", {"root.ts": 'export const a = 1;'}, /SINGLE_PRODUCT_ROOT_REQUIRED/],
  ["multiple product roots", {"a.product.ts": 'import { composeProduct } from "desert-sdk/src/index.ts"; export const A=composeProduct({});',
    "b.product.ts": 'import { composeProduct } from "desert-sdk/src/index.ts"; export const B=composeProduct({});'}, /SINGLE_PRODUCT_ROOT_REQUIRED/],
  ["legacy parallel product", {"a.product.ts": 'import { product } from "desert-sdk/src/index.ts"; export const A=product({});'}, /PRODUCT_CALL_NOT_ALLOWED/],
  ["wire catalog constructor", {"root.ts": 'import { viewIndex } from "desert-sdk/src/index.ts"; export const Views=viewIndex([]);'}, /PRODUCT_CALL_NOT_ALLOWED/],
  ["legacy string reference helper", {"root.ts": 'import { journeyReference } from "desert-sdk/src/index.ts"; export const Journey=journeyReference({}, "create-note");'}, /PRODUCT_CALL_NOT_ALLOWED/],
];
for (const [label, files, error] of prohibited) test(`source gate rejects ${label}`, async () => {
  await fixture(files, async root => assert.rejects(assertProductSource(root), error));
});

test("source gate permits a catalog projection without exposing module internals", async () => {
  await fixture({
    "root.product.ts": 'import { composeProduct, moduleIndex } from "desert-sdk/src/index.ts"; import { NotesModule } from "./modules/notes/notes.module.ts"; const Modules = moduleIndex([NotesModule]); export const Journeys = Modules.journeys; export const Product=composeProduct({modules:Modules});',
    "modules/notes/notes.module.ts": moduleSource,
  }, async root => assert.equal((await assertProductSource(root)).files.length, 2));
});

test("source gate refuses symlinked declarations", async () => {
  await fixture({"root.ts": 'export const a = 1;'}, async root => {
    await symlink(join(root, "root.ts"), join(root, "alias.ts"));
    await assert.rejects(assertProductSource(root), /PRODUCT_SYMLINK_NOT_ALLOWED/);
  });
});

test("source declarations cannot bypass semantic types with coercive assertions", async () => {
  const rootSource = 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});';
  for (const expression of ['{} as any', '{} as unknown', '{} as never', '{} as View', '<View>{}', '{} as unknown as View', '({} satisfies View) as any']) {
    await fixture({ "root.product.ts": rootSource, "views/home.view.ts":
      `import type { View } from "desert-sdk/src/index.ts"; export const Home = ${expression};`,
    }, async root => assert.rejects(assertProductSource(root), /PRODUCT_TYPE_ASSERTION_NOT_ALLOWED/, expression));
  }
  await fixture({ "root.product.ts": rootSource, "views/home.view.ts":
    'import type { View } from "desert-sdk/src/index.ts"; export const Home = { version: "desert.view/1", id: "home", content: [] } as const satisfies View;',
  }, async root => assert.equal((await assertProductSource(root)).files.length, 2));
});

test("source declarations reject explicit erased types in annotations and type aliases", async () => {
  const rootSource = 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});';
  const erased = [
    'export const Home: any = {};',
    'export const Home: unknown = {};',
    'export const Home: { readonly content: any[] } = { content: [] };',
    'export const Home: Readonly<Record<string, unknown>> = {};',
    'type Erased = any; export const Home: Erased = {};',
    'type Erased = unknown; export const Home: Erased = {};',
    'type Erased<T = any> = T; export const Home: Erased = {};',
    'interface Erased { readonly content: unknown } export const Home: Erased = { content: [] };',
    'export const Home = {} satisfies any;',
  ];
  for (const source of erased) {
    await fixture({ "root.product.ts": rootSource, "views/home.view.ts": source },
      async root => assert.rejects(assertProductSource(root), /PRODUCT_(?:ERASED_TYPE|TYPE_ANNOTATION)_NOT_ALLOWED/, source));
  }
  await fixture({ "root.product.ts": rootSource, "views/home.view.ts":
    'import type { View } from "desert-sdk/src/index.ts"; const source = { version: "desert.view/1", id: "home", content: [] } as const satisfies View; type HomeDefinition = typeof source; export const Home = source satisfies HomeDefinition;',
  }, async root => assert.equal((await assertProductSource(root)).files.length, 2));
});

test("declarative values preserve inferred identities instead of widening through annotations", async () => {
  const rootSource = 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});';
  for (const source of [
    'import { view, type View } from "desert-sdk/src/index.ts"; export const Notes: View = view({version:"desert.view/1",id:"notes",content:[]});',
    'export const id: string = "notes";',
    'const source = {id:"notes"} as const; export const Notes: typeof source = source;',
  ]) {
    await fixture({ "root.product.ts": rootSource, "views/notes.view.ts": source },
      async root => assert.rejects(assertProductSource(root), /PRODUCT_TYPE_ANNOTATION_NOT_ALLOWED/, source));
  }
});

test("authoring constructor calls infer source identities instead of accepting explicit type arguments", async () => {
  for (const args of ["any", "unknown", "never", "ProductComposition", "typeof source"]) {
    await fixture({ "root.product.ts":
      `import { composeProduct, type ProductComposition } from "desert-sdk/src/index.ts"; const source = {}; export const Product = composeProduct<${args}>(source);`,
    }, async root => assert.rejects(assertProductSource(root), /PRODUCT_(?:ERASED_TYPE|TYPE_ARGUMENTS)_NOT_ALLOWED/, args));
  }
  await fixture({ "root.product.ts":
    'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});',
    "modules/notes/notes.module.ts":
    'import { defineModule, type ModuleDefinition } from "desert-sdk/src/index.ts"; export const NotesModule = defineModule<ModuleDefinition>({id:"notes"});',
  }, async root => assert.rejects(assertProductSource(root), /PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED/));
  await fixture({ "root.product.ts":
    'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});',
    "views/home.view.ts":
    'import { view, type View } from "desert-sdk/src/index.ts"; export const Home = view<View>({version:"desert.view/1",id:"home",content:[]});',
  }, async root => assert.rejects(assertProductSource(root), /PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED/));
});

test("product declarations cannot silence TypeScript with comment directives", async () => {
  const rootSource = 'import { composeProduct } from "desert-sdk/src/index.ts"; export const Product = composeProduct({});';
  for (const directive of ["// @ts-ignore", "/// @ts-ignore", "// @ts-ignoreExtra", "// @ts-expect-error", "// @ts-nocheck",
    "/* @ts-ignore */", "/**\n * @ts-expect-error\n */", "//\t@ts-nocheck: skipped"]) {
    await fixture({ "root.product.ts": `${directive}\n${rootSource}` },
      async root => assert.rejects(assertProductSource(root), /PRODUCT_TYPE_SUPPRESSION_NOT_ALLOWED/, directive));
  }
  await fixture({ "root.product.ts": rootSource, "notes.ts": [
    '// Documentation mentions @ts-ignore without being a directive.',
    'export const note = "// @ts-ignore";',
    'export const blockExample = "/* @ts-expect-error */";',
    'export const templateExample = `// @ts-nocheck`;',
  ].join("\n") }, async root => assert.equal((await assertProductSource(root)).files.length, 2));
});
