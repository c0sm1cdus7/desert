// UNDECLARED_SQL in the gate (plan §15, step 7.6): the repository holds no hand-written SQL — no .sql file outside the
// generated folders and no DDL literal outside the generators. The detailed cases are tests/storage-undeclared-sql.test.ts;
// here the rule judges this checkout, and a control proves it is not vacuous: a hand file that embeds a statement copied
// from a generator is refused (the statement text is generated, so this file itself spells none).
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderCreateDatabase } from "../../src/storage/render-ddl.ts";
import { formatSqlViolation, readSqlTree, undeclaredSql } from "../../src/storage/undeclared-sql.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("UNDECLARED_SQL: this checkout holds no hand-written SQL", async () => {
  const tree = await readSqlTree(root);
  assert.ok(tree.has("src/local/database.ts") && tree.has("src/storage/generated/infrastructure.sql"), "the rule reads the source tree");
  assert.deepEqual(undeclaredSql(tree).map(formatSqlViolation), []);
});

test("UNDECLARED_SQL control: the same checkout with a copied statement or a restored schema.sql is refused", async () => {
  const tree = new Map(await readSqlTree(root));
  tree.set("src/local/bootstrap.ts", `export const statement = ${JSON.stringify(renderCreateDatabase("client"))};\n`);
  tree.set("src/local/schema.sql", "");
  assert.deepEqual(undeclaredSql(tree).map(entry => `${entry.path}:${entry.line}`).sort(), ["src/local/bootstrap.ts:1", "src/local/schema.sql:1"]);
});
