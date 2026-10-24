import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { postgresCluster } from "../src/testing/postgres-cluster.ts";
import { renderInfrastructureDdl } from "../src/storage/render-ddl.ts";

// The runtime applies the hand-written files in this order (database.ts, assets/installation.ts, execution/queue.ts).
const handWritten = ["src/local/schema.sql", "src/activities/schema.sql", "src/identity/schema.sql", "src/assets/schema.sql", "src/execution/schema.sql"];
const generated = "src/storage/generated/infrastructure.sql";
const root = new URL("../", import.meta.url);
const source = (path: string) => readFile(new URL(path, root), "utf8");

const catalogQueries = {
  tables: `SELECT table_schema, table_name, table_type FROM information_schema.tables
    WHERE table_schema IN ('public', 'desert_execution') ORDER BY 1, 2`,
  columns: `SELECT table_schema, table_name, column_name, ordinal_position, data_type, udt_name, is_nullable,
      column_default, is_identity, identity_generation, identity_start, identity_increment
    FROM information_schema.columns WHERE table_schema IN ('public', 'desert_execution') ORDER BY 1, 2, 4`,
  constraints: `SELECT n.nspname, c.relname, k.conname, k.contype, pg_get_constraintdef(k.oid) AS definition,
      k.condeferrable, k.condeferred, k.convalidated, k.connoinherit
    FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'desert_execution') ORDER BY 1, 2, 3`,
  indexes: `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
    WHERE schemaname IN ('public', 'desert_execution') ORDER BY 1, 2, 3`,
  sequences: `SELECT sequence_schema, sequence_name, data_type, start_value, minimum_value, maximum_value, increment, cycle_option
    FROM information_schema.sequences WHERE sequence_schema IN ('public', 'desert_execution') ORDER BY 1, 2`,
  schemas: `SELECT nspname FROM pg_namespace WHERE nspname IN ('public', 'desert_execution') ORDER BY 1`,
} as const;

type Catalog = Record<keyof typeof catalogQueries, readonly Record<string, unknown>[]>;
async function catalog(pool: Pool): Promise<Catalog> {
  const read = async (query: string) => (await pool.query<Record<string, unknown>>(query)).rows;
  return { tables: await read(catalogQueries.tables), columns: await read(catalogQueries.columns),
    constraints: await read(catalogQueries.constraints), indexes: await read(catalogQueries.indexes),
    sequences: await read(catalogQueries.sequences), schemas: await read(catalogQueries.schemas) };
}

test("STORAGE_DERIVATION: the committed infrastructure DDL is exactly what the declaration generates", async () => {
  assert.equal(await source(generated), renderInfrastructureDdl());
});

test("the generated infrastructure DDL produces the same catalog as the five hand-written schema.sql files", async () => {
  const cluster = postgresCluster();
  const pools: Pool[] = [];
  const open = async () => {
    const database = await cluster.database();
    const pool = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
    pools.push(pool);
    return pool;
  };
  try {
    const [byHand, byDeclaration, mutated] = [await open(), await open(), await open()];
    for (const path of handWritten) await byHand.query(await source(path));
    const ddl = await source(generated);
    await byDeclaration.query(ddl);
    await byDeclaration.query(ddl); // idempotent: the installer may run it on every start
    await mutated.query(ddl);
    const expected = await catalog(byHand), actual = await catalog(byDeclaration);
    assert.equal(expected.tables.length, 17);
    assert.equal(expected.columns.length, 102);
    assert.ok(expected.constraints.length > 17 * 2, "primary keys, foreign keys, checks, uniques and not-null constraints are compared");
    assert.deepEqual(expected.indexes.map(index => String(index.indexname)).filter(name => !/_(pkey|key)$/.test(name)).sort(),
      ["desert_single_administrator", "jobs_by_actor_state"]);
    assert.deepEqual(actual, expected);
    // Control: the comparison sees a single dropped check.
    await mutated.query("ALTER TABLE desert_runs DROP CONSTRAINT desert_runs_state_check");
    assert.notDeepEqual(await catalog(mutated), expected);
  } finally {
    await Promise.all(pools.map(pool => pool.end()));
    cluster.dispose();
  }
});
