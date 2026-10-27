import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compile } from "../src/index.ts";
import { assertProductSource } from "../src/authoring/index.ts";
import { readScopes } from "../src/web/client/view-scopes.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { Notebook, NotebookProduct, NotebookViewProgram } from "../products/notebook/product.ts";
import { CreateNote, ReadNote, ArchiveNote } from "../products/notebook/journeys.ts";

test("Notebook's authored tree passes the same declaration boundary as an external product", async () => {
  const result = await assertProductSource(fileURLToPath(new URL("../products/notebook/src", import.meta.url)));
  assert.ok(result.files.includes("notebook.product.ts"));
  assert.ok(result.files.includes("modules/notes/note.publication.ts"));
  assert.ok(result.files.includes("views/workspace.view.ts"));
  assert.equal(result.files.filter(file => file.endsWith(".product.ts")).length, 1);
});

test("Notebook compiles its module and workspace together; scopes derive from the single View program", () => {
  const application = compile(NotebookProduct);
  const human = application.surface("human") as HumanSurface;
  const [scope] = readScopes(NotebookViewProgram, human);
  assert.ok(scope?.kind === "read");
  assert.equal(scope.read.id, ReadNote.id);
  assert.deepEqual(scope.creations.map(item => item.id), [CreateNote.id]);
  assert.deepEqual(scope.subjectActions.map(item => item.id), [ArchiveNote.id]);
  assert.equal(NotebookProduct.definition, Notebook);
  assert.equal(NotebookViewProgram.destinations.find(item => item.id === NotebookViewProgram.entry)?.entryJourney, ReadNote.id);
  for (const field of ["entry", "primaryAction", "subjectActions", "navigation"]) assert.equal(Object.hasOwn(human, field), false);
});

test("Notebook's stable import bridges only re-export the canonical declarations", async () => {
  for (const name of ["product", "note", "dependencies", "commands", "journeys", "exposures"]) {
    const source = await readFile(new URL(`../products/notebook/${name}.ts`, import.meta.url), "utf8");
    assert.ok(source.trim().split("\n").every(line => /^export \{.*\} from "\.\/src\/.+";$/.test(line)), name);
  }
});
