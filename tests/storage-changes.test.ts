import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { applyChanges, maxChangesPerAction, moduleStorage, type Change, type ChangeReceipt } from "../src/storage/change-set.ts";
import { objectStorage } from "../src/storage/ddl.ts";
import { SpanishClient, StorageKinds, storageKindsModules } from "./fixtures/storage-kinds.ts";
import { database, rejectsNamed, rowCount, schema, seed, taskFacts } from "./support/storage-database.ts";

// Owner answer Q3: one action makes up to 8 changes, all inside ONE module, all or nothing, with one receipt.
const storage = objectStorage(StorageKinds, SpanishClient);
const tasks = moduleStorage(storage, "tasks", storageKindsModules.tasks);
const rejects = (code: string) => (error: unknown) => error instanceof Error && error.message.startsWith(`${code}: `);
const project = (owner: string, name: string): Change => ({ kind: "create", object: "project", id: randomUUID(), facts: { name, color: "blue", owner } });

/** A new run of `actor` and its one intent, so the receipt row (desert_receipts) is written in the same transaction as the changes. */
async function intent(pool: Pool, actor: string) {
  const id = randomUUID(), run = randomUUID();
  await pool.query(`INSERT INTO desert_runs (id, actor, surface, journey, subject, contract_digest, expires_at, state)
    VALUES ($1, $2, 'human', 'plan', NULL, 'digest', now() + interval '1 day', 'prepared')`, [run, actor]);
  await pool.query("INSERT INTO desert_intents (id, run_id, input, effect, confirmation_digest) VALUES ($1, $2, '{}', '{}', 'digest')", [id, run]);
  return { id, record: (client: PoolClient, receipt: ChangeReceipt) =>
    client.query("INSERT INTO desert_receipts (intent_id, result) VALUES ($1, $2)", [id, JSON.stringify(receipt)]).then(() => undefined) };
}
const receipts = (pool: Pool, intentId: string) =>
  pool.query<{ result: ChangeReceipt }>("SELECT result FROM desert_receipts WHERE intent_id = $1", [intentId]).then(({ rows }) => rows);

test("Q3: the limit is 8 changes per action", () => assert.equal(maxChangesPerAction, 8));

test("Q3 control: 8 changes of one module commit together and leave exactly one receipt naming each object in order", async () => {
  const pool = await database(StorageKinds);
  const { owner, task } = await seed(pool);
  const created = Array.from({ length: 7 }, (_, index) => project(owner, `P${index}`));
  const changes: Change[] = [...created, { kind: "update", object: "task", id: task, expectedVersion: 1, set: { status: "done" } }];
  const { id, record } = await intent(pool, owner);
  const receipt = await applyChanges(pool, tasks, changes, record);
  assert.deepEqual(receipt, { objects: [...created.map(change => ({ id: change.id, type: "project", version: 1, change: "created" })),
    { id: task, type: "task", version: 2, change: "updated" }] });
  assert.deepEqual((await receipts(pool, id)).map(row => row.result), [receipt]);
  assert.equal(await rowCount(pool, `${schema}.project`), 8);
  assert.deepEqual((await pool.query(`SELECT status, version FROM ${schema}.task WHERE id = $1`, [task])).rows, [{ status: "done", version: 2 }]);
});

test("Q3 atomicity against PostgreSQL: when the 8th change violates a constraint, none of the 8 and no receipt remain", async () => {
  const pool = await database(StorageKinds);
  const { owner, task } = await seed(pool);
  const changes: Change[] = [{ kind: "update", object: "task", id: task, expectedVersion: 1, set: { status: "done" } },
    ...Array.from({ length: 6 }, (_, index) => project(owner, `P${index}`)), project(owner, "Home")]; // "Home" is seeded
  const { id, record } = await intent(pool, owner);
  await rejectsNamed(applyChanges(pool, tasks, changes, record), "unique_violation", "project_owner_name_key");
  assert.equal(await rowCount(pool, `${schema}.project`), 1);
  assert.deepEqual((await pool.query(`SELECT status, version FROM ${schema}.task WHERE id = $1`, [task])).rows, [{ status: "open", version: 1 }]);
  assert.deepEqual(await receipts(pool, id), []);
});

test("Q3 atomicity: a receipt that cannot be written undoes the changes; a stale version undoes the earlier changes", async () => {
  const pool = await database(StorageKinds);
  const { owner, task } = await seed(pool);
  const { record } = await intent(pool, owner);
  await applyChanges(pool, tasks, [project(owner, "First")], record);
  await assert.rejects(applyChanges(pool, tasks, [project(owner, "Second")], record), /desert_receipts_pkey/); // one receipt per intent
  await assert.rejects(applyChanges(pool, tasks, [project(owner, "Third"),
    { kind: "update", object: "task", id: task, expectedVersion: 7, set: { status: "done" } }], (await intent(pool, owner)).record), rejects("VERSION_CONFLICT"));
  await assert.rejects(applyChanges(pool, tasks, [project(owner, "Fourth"),
    { kind: "update", object: "task", id: randomUUID(), expectedVersion: 1, set: { status: "done" } }], (await intent(pool, owner)).record), rejects("NOT_FOUND"));
  assert.deepEqual((await pool.query(`SELECT name FROM ${schema}.project ORDER BY name COLLATE "C"`)).rows.map(row => row.name), ["First", "Home"]);
});

test("Q3 negative: no action, more than 8 changes, another module, two changes to one object, or an undeclared fact is refused before any write", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset, task } = await seed(pool);
  const { record } = await intent(pool, owner);
  const nine = Array.from({ length: 9 }, (_, index) => project(owner, `N${index}`));
  await assert.rejects(applyChanges(pool, tasks, nine, record), rejects("EFFECT_LIMIT"));
  await assert.rejects(applyChanges(pool, tasks, [], record), rejects("EFFECT_LIMIT"));
  const album: Change = { kind: "create", object: "photo-album", id: randomUUID(), facts: { title: "Trip", owner } };
  await assert.rejects(applyChanges(pool, tasks, [project(owner, "A"), album], record), rejects("EFFECT_FOREIGN_OBJECT"));
  const update = (status: string): Change => ({ kind: "update", object: "task", id: task, expectedVersion: 1, set: { status } });
  await assert.rejects(applyChanges(pool, tasks, [update("done"), update("open")], record), rejects("EFFECT_DUPLICATE_TARGET"));
  await assert.rejects(applyChanges(pool, tasks, [{ kind: "update", object: "task", id: task, expectedVersion: 1, set: { extras: "{}" } }], record),
    rejects("EFFECT_UNKNOWN_FACT"));
  const { title: _omitted, ...partial } = taskFacts(owner, asset);
  await assert.rejects(applyChanges(pool, tasks, [{ kind: "create", object: "task", id: randomUUID(), facts: partial }], record),
    rejects("CREATE_ASSIGNMENT_MISSING"));
  assert.equal(await rowCount(pool, `${schema}.project`), 1);
  assert.equal(await rowCount(pool, "desert_receipts"), 0);
  assert.throws(() => moduleStorage(storage, "tasks", ["missing"]), rejects("EFFECT_FOREIGN_OBJECT"));
});
