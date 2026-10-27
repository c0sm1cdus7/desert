import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readSqlTree, undeclaredSql } from "../src/storage/undeclared-sql.ts";

// Plan §15, step 7.6: rule UNDECLARED_SQL — no .sql file outside the generated folders and no CREATE|ALTER|DROP string
// literal outside the generators. This file is a storage test, so it may spell the literals its negative cases need.
const judge = (files: Record<string, string>) => undeclaredSql(new Map(Object.entries(files))).map(entry => `${entry.path}:${entry.line}: ${entry.what}`);

test("UNDECLARED_SQL negative: a hand-written .sql file anywhere but the generated folders", () => {
  assert.deepEqual(judge({ "src/local/schema.sql": "", "products/notebook/seed.sql": "", "tests/fixtures/x.sql": "" }), [
    "src/local/schema.sql:1: a .sql file outside the generated folders",
    "products/notebook/seed.sql:1: a .sql file outside the generated folders",
    "tests/fixtures/x.sql:1: a .sql file outside the generated folders",
  ]);
});

test("UNDECLARED_SQL negative: a DDL string, template or template part in code, including a Svelte script", () => {
  assert.deepEqual(judge({
    "src/local/database.ts": `const a = 1;\nawait client.query("CREATE TABLE t (id uuid)");\n`,
    "src/identity/migrate.ts": "await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS x text`);\n",
    "src/execution/reset.ts": "const sql = `SELECT 1; ${'x'} DROP TABLE jobs`;\n",
    "tests/fixtures/fault.ts": `export const fault = 'CREATE TRIGGER f BEFORE INSERT ON t';\n`,
    "src/storage/migrate.ts": `await client.query("DROP TABLE t");\n`,
    "src/svelte/Example.svelte": `<p>CREATE</p>\n<script lang="ts">\n  const statement = "DROP SCHEMA x";\n</script>\n`,
  }), [
    "src/local/database.ts:2: a CREATE string literal",
    "src/identity/migrate.ts:1: a ALTER string literal",
    "src/execution/reset.ts:1: a DROP string literal",
    "tests/fixtures/fault.ts:1: a CREATE string literal",
    "src/storage/migrate.ts:1: a DROP string literal",
    "src/svelte/Example.svelte:3: a DROP string literal",
  ]);
});

test("UNDECLARED_SQL positive: generated folders, the generators, their tests, comments, prose and lower case pass", () => {
  assert.deepEqual(judge({
    "src/storage/generated/infrastructure.sql": "CREATE TABLE x ();",
    "src/storage/migrations/a-b.sql": "ALTER TABLE x ADD COLUMN y text;",
    "src/storage/render-ddl.ts": "export const ddl = `CREATE TABLE IF NOT EXISTS ${name}`;",
    "src/storage/plan.ts": "export const step = `ALTER TABLE ${table} ADD COLUMN ${column}`;",
    "src/storage/plan-columns.ts": "export const drop = `DROP INDEX ${name}`;",
    "src/storage/migration-sql.ts": `export const header = "CREATE TABLE";`,
    "tests/migration-plan.test.ts": `const body = text.slice(text.indexOf("\\nCREATE") + 1);`,
    "tests/storage-objects.test.ts": `const expected = "CREATE INDEX IF NOT EXISTS x";`,
    "src/local/notes.ts": "// CREATE TABLE is generated; see src/storage/render-ddl.ts\nconst label = 'Create a note, then drop it';\n",
    "src/web/markup.svelte": "<p>CREATE</p>\n<script>const a = 'create';</script>\n",
    "docs/STORAGE.md": "CREATE TABLE in prose is not code",
    "src/types.d.ts": `export type Statement = "CREATE";`,
  }), []);
});

test("UNDECLARED_SQL: the tree reader skips dependencies, worktrees and local output but reads source folders named build", async () => {
  const root = await mkdtemp(join(tmpdir(), "desert-undeclared-sql-"));
  try {
    const files = { "node_modules/pg/x.sql": "", ".claude/worktrees/a/src/schema.sql": "", ".local/notebook/x.sql": "", "build/x.sql": "",
      "src/build/serve.ts": `export const s = "DROP DATABASE x";`, "src/local/schema.sql": "", "README.md": "" };
    for (const [path, text] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), text);
    }
    assert.deepEqual([...(await readSqlTree(root)).keys()].sort(), ["src/build/serve.ts", "src/local/schema.sql"]);
    assert.deepEqual(undeclaredSql(await readSqlTree(root)).map(entry => entry.path), ["src/build/serve.ts", "src/local/schema.sql"].sort());
  } finally { await rm(root, { recursive: true, force: true }); }
});
