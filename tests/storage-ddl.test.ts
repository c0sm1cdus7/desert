import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { postgresCluster } from "../src/testing/postgres-cluster.ts";
import { renderControllerDdl, renderExecutionDdl, renderInfrastructureDdl } from "../src/storage/render-ddl.ts";

// Slice 7.6: the five hand-written schema.sql files are gone; each installer applies its group of the generated DDL
// (src/local/database.ts the controller's, src/execution/queue.ts the execution queue's). Together they must build exactly
// the catalog of the committed infrastructure file, the one the gate compares with the declaration.
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
  functions: `SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'desert_execution') ORDER BY 1, 2, 3`,
} as const;

type Catalog = Record<keyof typeof catalogQueries, readonly Record<string, unknown>[]>;
async function catalog(pool: Pool): Promise<Catalog> {
  const read = async (query: string) => (await pool.query<Record<string, unknown>>(query)).rows;
  return { tables: await read(catalogQueries.tables), columns: await read(catalogQueries.columns),
    constraints: await read(catalogQueries.constraints), indexes: await read(catalogQueries.indexes),
    sequences: await read(catalogQueries.sequences), schemas: await read(catalogQueries.schemas),
    functions: await read(catalogQueries.functions) };
}

test("STORAGE_DERIVATION: the committed infrastructure DDL is exactly what the declaration generates", async () => {
  assert.equal(await source(generated), renderInfrastructureDdl());
});

test("the installers' generated DDL groups build the same catalog as the committed infrastructure file, idempotently", async () => {
  const cluster = postgresCluster();
  const pools: Pool[] = [];
  const open = async () => {
    const database = await cluster.database();
    const pool = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
    pools.push(pool);
    return pool;
  };
  try {
    const [byInstallers, byFile, mutated] = [await open(), await open(), await open()];
    for (const ddl of [renderControllerDdl(), renderExecutionDdl()]) {
      await byInstallers.query(ddl);
      await byInstallers.query(ddl); // idempotent: the installers apply it on every start
    }
    const ddl = await source(generated);
    await byFile.query(ddl);
    await mutated.query(ddl);
    const expected = await catalog(byFile), actual = await catalog(byInstallers);
    assert.equal(expected.tables.length, 15);
    assert.equal(expected.tables.some(table => /objects|asset_links/.test(String(table.table_name))), false);
    assert.ok(expected.constraints.length > 15 * 2, "primary keys, foreign keys, checks, uniques and not-null constraints are compared");
    assert.deepEqual(expected.indexes.map(index => String(index.indexname)).filter(name => !/_(pkey|key)$/.test(name)).sort(),
      ["desert_single_administrator", "jobs_by_actor_state"]);
    assert.deepEqual(expected.functions.map(entry => `${String(entry.nspname)}.${String(entry.proname)}`).filter(name => name.includes("desert_")),
      ["public.desert_search_key"]);
    assert.deepEqual(actual, expected);
    // Control: the comparison sees a single dropped check.
    await mutated.query("ALTER TABLE desert_runs DROP CONSTRAINT desert_runs_state_check");
    assert.notDeepEqual(await catalog(mutated), expected);
  } finally {
    await Promise.all(pools.map(pool => pool.end()));
    cluster.dispose();
  }
});
