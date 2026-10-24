// N56 (plan §14): a product view that writes a literal label is refused by the product source gate before any declaration
// runs. The product is DESERT's notebook (the same gate VOID runs through scripts/check-source.ts), copied and mutated.
import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";

const source = fileURLToPath(new URL("../../products/notebook/src", import.meta.url));
const view = "modules/notes/views/notes.view.ts";

async function withCopy(mutate: (root: string) => Promise<void>, check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "desert-n56-"));
  try { await cp(source, root, { recursive: true }); await mutate(root); await check(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test("N56 a literal label in a product view is LITERAL_TEXT at the source gate", async () => {
  await withCopy(async root => {
    const path = join(root, view), text = await readFile(path, "utf8"), anchor = "label: m.notes.createNote";
    assert.ok(text.includes(anchor), `MUTATION_ANCHOR_MISSING: ${view}: ${anchor}`);
    await writeFile(path, text.replace(anchor, 'label: "Notes"'));
  }, async root => assert.rejects(assertProductSource(root),
    { message: `LITERAL_TEXT: ${view}:8: label is the literal "Notes"; write it in messages/<locale>.json and use m.<owner>.<meaning>` }));
});

test("N56 a hand-made message is LITERAL_TEXT too: keys come from the generated accessor", async () => {
  await withCopy(async root => {
    const path = join(root, view), text = await readFile(path, "utf8");
    await writeFile(path, text.replace("label: m.notes.createNote", 'label: { key: "notes.createNote" }'));
  }, async root => assert.rejects(assertProductSource(root), /^Error: LITERAL_TEXT: modules\/notes\/views\/notes\.view\.ts:8: a message written by hand/));
});

test("N56 control: the unchanged product passes the source gate with its message catalog", async () => {
  await withCopy(async () => {}, async root => assert.ok((await assertProductSource(root)).files.includes("messages/keys.ts")));
});
