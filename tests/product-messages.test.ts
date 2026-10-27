// Plan §14 at the product source gate: a product's sentences live in messages/<locale>.json; messages/keys.ts is generated
// from them (MESSAGE_DERIVATION otherwise) and is the one file every module may import; a literal in a message field is
// LITERAL_TEXT, while domain calls that name facts or ports keep their strings.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import test from "node:test";
import { assertProductSource } from "../src/authoring/index.ts";
import { productMessageKeys } from "../src/authoring/messages.ts";

const bundle = '{ "notes": { "title": "Notes", "label": "Notes" } }';
const keys = productMessageKeys(new Map([["en", bundle]]));
const root = 'import { composeProduct } from "desert-sdk/src/index.ts"; import { Messages } from "./messages/keys.ts"; export const Product = composeProduct({ messages: Messages });';
const view = (title: string) => `import { Components, defineView } from "desert-sdk/src/index.ts"; import { m } from "../../../messages/keys.ts";
export const NotesView = defineView({ name: "notes", content: [Components.Header({ title: ${title} })] });`;
const module = 'import { defineModule } from "desert-sdk/src/index.ts"; import { NotesView } from "./views/notes.view.ts"; export const NotesModule = defineModule({ id: "notes", views: [NotesView] });';

async function fixture(files: Record<string, string>, run: (root: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "desert-product-messages-"));
  try {
    for (const [name, source] of Object.entries(files)) {
      await mkdir(dirname(join(directory, name)), { recursive: true });
      await writeFile(join(directory, name), source);
    }
    await run(directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
const product = (overrides: Record<string, string | undefined> = {}) => Object.fromEntries(Object.entries({
  "void.product.ts": root, "messages/en.json": bundle, "messages/keys.ts": keys,
  "modules/notes/notes.module.ts": module, "modules/notes/views/notes.view.ts": view("m.notes.title"), ...overrides,
}).filter((entry): entry is [string, string] => entry[1] !== undefined));

test("a product with its bundle, its generated keys and m.* in a module view passes; the bundle is not a declaration file", async () => {
  await fixture(product(), async directory => assert.deepEqual((await assertProductSource(directory)).files,
    ["messages/keys.ts", "modules/notes/notes.module.ts", "modules/notes/views/notes.view.ts", "void.product.ts"]));
});

test("MESSAGE_DERIVATION: keys.ts missing, stale, edited, or without a bundle", async () => {
  const cases: [string, Record<string, string | undefined>, RegExp][] = [
    ["missing", { "messages/keys.ts": undefined }, /^MESSAGE_DERIVATION: messages\/keys\.ts is missing; run `npm run messages:write`$/],
    ["stale", { "messages/en.json": '{ "notes": { "title": "Notes", "label": "Notes", "subtitle": "New" } }' }, /MESSAGE_DERIVATION: messages\/keys\.ts differs from the messages bundles/],
    ["edited", { "messages/keys.ts": keys.replace('"Notes"', '"Changed"') }, /MESSAGE_DERIVATION: messages\/keys\.ts differs/],
    ["no bundle", { "messages/en.json": undefined }, /MESSAGE_DERIVATION: messages\/keys\.ts has no messages\/<locale>\.json bundle/],
  ];
  for (const [label, overrides, expected] of cases) {
    await fixture(product(overrides), directory => assert.rejects(assertProductSource(directory), { message: expected }, label));
  }
});

test("LITERAL_TEXT: a sentence in a message field, a template sentence and a hand-made message", async () => {
  const cases: [string, string, RegExp][] = [
    ["literal", '"Notes"', /^LITERAL_TEXT: modules\/notes\/views\/notes\.view\.ts:2: title is the literal "Notes"/],
    ["template", "`Notes`", /LITERAL_TEXT: .*title is the literal `Notes`/],
    ["hand-made", '{ key: "notes.title" }', /LITERAL_TEXT: .*a message written by hand/],
  ];
  for (const [label, title, expected] of cases) {
    await fixture(product({ "modules/notes/views/notes.view.ts": view(title) }), directory =>
      assert.rejects(assertProductSource(directory), { message: expected }, label));
  }
});

test("domain calls keep their strings: a reference names a fact, a port named title is not a sentence", async () => {
  const object = `import { objectType, references, text, viewPorts } from "desert-sdk/src/index.ts";
export const Project = objectType({ id: "project", facts: { name: text() } });
export const Task = objectType({ id: "task", facts: { projects: references(Project, { label: "name" }) } });
export const Ports = viewPorts({ inputs: { title: "form" }, outputs: [] });`;
  await fixture(product({ "modules/notes/note.object.ts": object }), async directory =>
    assert.ok((await assertProductSource(directory)).files.includes("modules/notes/note.object.ts")));
});

test("a bundle anywhere but the root messages folder is not a product file", async () => {
  await fixture(product({ "modules/notes/messages/en.json": bundle }), directory =>
    assert.rejects(assertProductSource(directory), { message: "PRODUCT_FILE_NOT_ALLOWED: modules/notes/messages/en.json" }));
});
