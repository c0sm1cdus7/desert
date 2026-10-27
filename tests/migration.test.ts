// Plan §15, step 7.3 against PostgreSQL: a declaration change is planned into a generated migration and applied to client
// databases that hold data; the data after is asserted, a migrated database has exactly the catalog of a fresh install of
// the new declaration, a failed client never blocks or corrupts another, and an installation whose chain does not lead to
// the current digest refuses to serve (INSTALLATION_MISMATCH).
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseError, type Pool } from "pg";
import { recordInstallation, requireInstallation } from "../src/local/installation.ts";
import { compile } from "../src/compile.ts";
import { migrateClient, migrateClients, type MigrationTarget } from "../src/storage/migrate.ts";
import { English, LedgerV1, LedgerV2, LedgerV3, v3Decisions } from "./fixtures/migration-ledger.ts";
import { repository } from "./support/migration-repository.ts";
import { clientDatabase } from "./support/storage-database.ts";

const ns = "product_ledger";
const target = (definition: unknown): MigrationTarget => ({ product: "ledger", installation: English, digest: compile(definition).digest });

/** A client database installed fresh at `definition`'s digest, as database.ts install() records it. */
async function client(definition: unknown) {
  const pool = await clientDatabase(English, definition);
  const connection = await pool.connect();
  try { await recordInstallation(connection, { product: "ledger", digest: compile(definition).digest, roles: [] }); } finally { connection.release(); }
  return pool;
}
async function owner(pool: Pool) {
  const id = randomUUID();
  await pool.query("INSERT INTO desert_identities (id, label, credential_hash, expires_at) VALUES ($1, 'owner', $2, now() + interval '1 day')", [id, randomUUID()]);
  return id;
}
async function entry(pool: Pool, who: string, title: string, state: string, tags: string[] = []) {
  const id = randomUUID();
  await pool.query(`INSERT INTO ${ns}.entry (id, version, title, state, owner, tags) VALUES ($1, 1, $2, $3, $4, $5)`, [id, title, state, who, tags]);
  return id;
}
const entries = async (pool: Pool) => (await pool.query(`SELECT * FROM ${ns}.entry ORDER BY title`)).rows;
const installed = async (pool: Pool) => (await pool.query("SELECT installation_digest, migration_chain FROM desert_installation")).rows[0];

/** Everything a fresh install of a declaration creates in the product schema, independent of column order. */
async function catalog(pool: Pool) {
  const read = async (sql: string) => (await pool.query(sql, [ns])).rows;
  return {
    columns: await read(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, collation_name
      FROM information_schema.columns WHERE table_schema = $1 ORDER BY 1, 2`),
    constraints: await read(`SELECT c.relname, k.conname, k.contype, pg_get_constraintdef(k.oid) AS definition, k.condeferrable
      FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid WHERE c.relnamespace = $1::regnamespace ORDER BY 1, 2`),
    indexes: await read("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = $1 ORDER BY 1, 2"),
    triggers: await read(`SELECT c.relname, t.tgname, p.proname, p.prosrc FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid WHERE c.relnamespace = $1::regnamespace AND NOT t.tgisinternal ORDER BY 1, 2`),
    functions: await read("SELECT proname, prosrc FROM pg_proc WHERE pronamespace = $1::regnamespace ORDER BY 1"),
    collations: await read("SELECT collname, colllocale FROM pg_collation WHERE collnamespace = $1::regnamespace ORDER BY 1"),
  };
}

test("additive change: planned without decisions, applied to a client with data, data unchanged, catalog equals a fresh install", async () => {
  const repo = repository();
  try {
    assert.equal(repo.plan(LedgerV1, English), undefined, "the first declaration has no previous digest");
    const path = repo.plan(LedgerV2, English);
    assert.ok(path?.endsWith(`ledger.en.${compile(LedgerV1).digest}-${compile(LedgerV2).digest}.sql`), path);
    const [migration] = repo.migrations();
    assert.doesNotMatch(migration!.body, /DROP (TABLE|COLUMN|SCHEMA)|^UPDATE /m, "additive: nothing is dropped and no stored value is rewritten");
    assert.match(migration!.body, /ADD CHECK \("state" IN \('draft', 'active', 'archived', 'paused'\)\)/, "the enum widens in place");

    const pool = await client(LedgerV1), who = await owner(pool);
    await entry(pool, who, "Groceries", "draft", ["home"]);
    await entry(pool, who, "Rent", "active");
    const before = await entries(pool);
    const migrated = await migrateClient(pool, target(LedgerV2), repo.migrations());
    assert.deepEqual(migrated, { from: compile(LedgerV1).digest, to: compile(LedgerV2).digest, applied: [migration!.digest] });
    assert.deepEqual(await entries(pool), before, "every stored value and version is unchanged");
    assert.deepEqual(await installed(pool), { installation_digest: compile(LedgerV2).digest, migration_chain: [migration!.digest] });
    // What v2 admits is now admitted: a wider enum, a longer title, a book and a reference to it.
    const paused = await entry(pool, who, "x".repeat(60), "paused");
    const book = randomUUID();
    await pool.query(`INSERT INTO ${ns}.book (id, version, name, color, owner) VALUES ($1, 1, 'Home', 'blue', $2)`, [book, who]);
    await pool.query(`INSERT INTO ${ns}.entry_books (object_id, target_id, position) VALUES ($1, $2, 0)`, [paused, book]);
    const [migratedCatalog, freshCatalog] = [await catalog(pool), await catalog(await client(LedgerV2))];
    assert.ok(freshCatalog.columns.length === 14 && freshCatalog.constraints.length > 20 && freshCatalog.triggers.length === 1, "control: the catalog sees the schema");
    assert.notDeepEqual(await catalog(await client(LedgerV1)), freshCatalog, "control: the catalog tells v1 from v2");
    assert.deepEqual(migratedCatalog, freshCatalog);
    assert.deepEqual(await migrateClient(pool, target(LedgerV2), repo.migrations()), { from: compile(LedgerV2).digest, to: compile(LedgerV2).digest, applied: [] });
  } finally { repo.dispose(); }
});

test("destructive change with its decisions: every client migrates alone; one whose rows break the narrowing fails and keeps its data", async () => {
  const repo = repository();
  try {
    repo.plan(LedgerV1, English);
    repo.plan(LedgerV2, English);
    repo.plan(LedgerV3, English, v3Decisions);
    const [first, second, third] = [await client(LedgerV1), await client(LedgerV1), await client(LedgerV1)];
    for (const pool of [first, second, third]) {
      const who = await owner(pool);
      await entry(pool, who, "Groceries", "draft", ["home"]);
      await entry(pool, who, "Rent", "active");
      await entry(pool, who, "Trip", "archived", ["away", "fun"]);
    }
    await entry(second, (await second.query("SELECT id FROM desert_identities")).rows[0].id, "A title too long for v3", "draft");
    const secondBefore = { rows: await entries(second), catalog: await catalog(second), installed: await installed(second) };
    const outcomes = await migrateClients([{ client: "first", pool: first }, { client: "second", pool: second }, { client: "third", pool: third }],
      target(LedgerV3), repo.migrations());

    assert.deepEqual(outcomes.map(outcome => [outcome.client, "migrated" in outcome]), [["first", true], ["second", false], ["third", true]]);
    const failed = outcomes[1]!;
    assert.ok("failed" in failed && failed.failed instanceof DatabaseError && failed.failed.code === "23514", "the narrowed title check rejects the long title");
    assert.deepEqual({ rows: await entries(second), catalog: await catalog(second), installed: await installed(second) }, secondBefore,
      "the failed client is exactly as it was: v1 digest, v1 tables, its data");

    const fresh = await client(LedgerV3);
    for (const pool of [first, third]) {
      assert.deepEqual((await entries(pool)).map(row => [row.title, row.state, row.priority, row.version]),
        [["Groceries", "active", "3", 2], ["Rent", "active", "3", 2], ["Trip", "archived", "3", 2]],
        "draft became active, every object received priority 3, and every changed object moved one version");
      assert.equal((await entries(pool)).some(row => "tags" in row), false, "the dropped fact is gone");
      assert.deepEqual(await catalog(pool), await catalog(fresh));
      assert.deepEqual((await installed(pool)).migration_chain, repo.migrations().map(step => step.digest));
    }
  } finally { repo.dispose(); }
});

test("INSTALLATION_MISMATCH: no committed chain to the digest, an unknown chain, another product; a fresh install at the digest serves", async () => {
  const repo = repository();
  try {
    repo.plan(LedgerV1, English);
    const pool = await client(LedgerV1);
    await assert.rejects(migrateClient(pool, target(LedgerV2), repo.migrations()), /^Error: INSTALLATION_MISMATCH: no committed migration chain leads from /);
    await assert.rejects(migrateClient(pool, { ...target(LedgerV1), product: "other" }, repo.migrations()), /INSTALLATION_MISMATCH: the database holds product ledger/);
    const serve = async (definition: unknown) => {
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        await requireInstallation(connection, { product: "ledger", digest: compile(definition).digest, roles: [] });
      } finally { await connection.query("ROLLBACK"); connection.release(); }
    };
    await serve(LedgerV1);
    await assert.rejects(serve(LedgerV2), /^Error: INSTALLATION_MISMATCH$/, "the code is ahead of the database");

    repo.plan(LedgerV2, English);
    await migrateClient(pool, target(LedgerV2), repo.migrations());
    // The repository's committed migrations do not hold this throwaway chain, so the runtime refuses it.
    await assert.rejects(serve(LedgerV2), /^Error: INSTALLATION_MISMATCH$/);
    await pool.query("UPDATE desert_installation SET migration_chain = $1", [["0".repeat(64)]]);
    await assert.rejects(migrateClient(pool, target(LedgerV2), repo.migrations()), /INSTALLATION_MISMATCH: its migration chain does not lead to its digest/);
  } finally { repo.dispose(); }
});
