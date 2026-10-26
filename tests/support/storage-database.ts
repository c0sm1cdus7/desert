// Fresh databases with the infrastructure and object DDL applied, and the named-violation assertions the storage
// tests share. One cluster per test file; every pool is closed and the cluster removed after the file's tests.
// Each database stands for one client installation (owner answer Q4): a new database is a new client.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseError, Pool } from "pg";
import type { ClientInstallation } from "../../src/storage/client-installation.ts";
import { renderObjectDdl } from "../../src/storage/ddl.ts";
import { renderInfrastructureDdl } from "../../src/storage/render-ddl.ts";
import { postgresCluster } from "../../src/testing/postgres-cluster.ts";
import { SpanishClient } from "../fixtures/storage-kinds.ts";

// SQLSTATE names (PostgreSQL Appendix A): the error a violation raises is named, never a bare failure.
export const sqlState = { check_violation: "23514", foreign_key_violation: "23503", unique_violation: "23505" } as const;
export const schema = "product_storage_kinds";
const cluster = postgresCluster();
const pools: Pool[] = [];
test.after(async () => { await Promise.all(pools.map(pool => pool.end())); cluster.dispose(); });

/** A new client installation's database on the shared cluster, with `definitions` installed for `installation`. */
export async function clientDatabase(installation: ClientInstallation, ...definitions: readonly unknown[]) {
  const target = await cluster.database();
  const pool = new Pool({ host: target.socketDirectory, database: target.database, user: target.user });
  pools.push(pool);
  await pool.query(renderInfrastructureDdl());
  await pool.query(renderInfrastructureDdl()); // idempotent: an installer may apply it on every start
  for (const definition of definitions) {
    await pool.query(renderObjectDdl(definition, installation));
    await pool.query(renderObjectDdl(definition, installation));
  }
  return pool;
}
export const database = (...definitions: readonly unknown[]) => clientDatabase(SpanishClient, ...definitions);

export async function rejectsNamed(run: Promise<unknown>, state: keyof typeof sqlState, constraint: string, message?: RegExp) {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof DatabaseError, String(error));
    assert.equal(error.code, sqlState[state], error.message);
    assert.equal(error.constraint, constraint, error.message);
    if (message) assert.match(error.message, message);
    return true;
  });
}
/** True once another session of this database waits on a row lock (polled for at most five seconds). */
export async function waitingOnLock(pool: Pool): Promise<boolean> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const { rows } = await pool.query<{ waiting: boolean }>(`SELECT count(*) > 0 AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`);
    if (rows[0]?.waiting) return true;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return false;
}
export const tableCount = async (pool: Pool, namespace: string) => Number((await pool.query<{ count: string }>(
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = $1", [namespace])).rows[0]?.count);
export const rowCount = async (pool: Pool, table: string) =>
  Number((await pool.query<{ count: string }>(`SELECT count(*) FROM ${table}`)).rows[0]?.count);

/** One identity, one attached asset, one project, one task with valid facts. */
export async function seed(pool: Pool) {
  const owner = randomUUID(), asset = randomUUID(), store = randomUUID(), run = randomUUID(), project = randomUUID(), task = randomUUID();
  await pool.query("INSERT INTO desert_identities (id, label, credential_hash, expires_at) VALUES ($1, 'owner', $2, now() + interval '1 day')", [owner, randomUUID()]);
  await pool.query(`INSERT INTO desert_asset_store (singleton, id, installation, quota) VALUES (true, $1, $2, '{}')`, [store, randomUUID()]);
  await pool.query(`INSERT INTO desert_runs (id, actor, surface, journey, subject, contract_digest, expires_at, state)
    VALUES ($1, $2, 'human', 'import', NULL, 'digest', now() + interval '1 day', 'admitted')`, [run, owner]);
  await pool.query(`INSERT INTO desert_assets (id, store_id, actor, run_id, input_field, contract_digest, state, declared_size, reserved_bytes, metadata)
    VALUES ($1, $2, $3, $4, 'recording', 'digest', 'attached', 1, 1, NULL)`, [asset, store, owner, run]);
  await pool.query(`INSERT INTO ${schema}.project (id, version, name, color, owner) VALUES ($1, 1, 'Home', 'blue', $2)`, [project, owner]);
  await pool.query(insertTask, taskValues({ id: task, owner, recording: asset }));
  return { owner, asset, project, task, run };
}
export const insertTask = `INSERT INTO ${schema}.task (id, version, title, priority, estimate, status, owner, tags, recording, due_note, state)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
type TaskFacts = { id: string; owner: string; recording: string; version?: number; title?: string; priority?: number;
  estimate?: number | string; status?: string; tags?: string[]; dueNote?: string; state?: string };
export const taskValues = (facts: TaskFacts) => [facts.id, facts.version ?? 1, facts.title ?? "Write", facts.priority ?? 3,
  facts.estimate ?? 0, facts.status ?? "open", facts.owner, facts.tags ?? ["a"], facts.recording, facts.dueNote ?? "", facts.state ?? "active"];
/** The facts of a valid task, keyed by fact name, for a create change. */
export const taskFacts = (owner: string, recording: string, title = "Write") =>
  ({ title, priority: 3, estimate: 0, status: "open", owner, tags: ["a"], recording, dueNote: "", state: "active" });
