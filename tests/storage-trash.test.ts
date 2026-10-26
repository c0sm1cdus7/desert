import test from "node:test";
import assert from "node:assert/strict";
import { applyChanges, moduleStorage, type Change } from "../src/storage/change-set.ts";
import { objectStorage, renderObjectDdl } from "../src/storage/ddl.ts";
import { infrastructureTables } from "../src/storage/infrastructure.ts";
import { renderInfrastructureDdl } from "../src/storage/render-ddl.ts";
import { SpanishClient, StorageKinds, storageKindsModules } from "./fixtures/storage-kinds.ts";
import { database, rejectsNamed, rowCount, schema, seed } from "./support/storage-database.ts";

// Owner answer Q2: the trash is a state of the object, restored by its inverse action; a separate record (tombstone) exists
// only for a hard delete (Q18, slice 9). Trashing and restoring are ordinary updates of the declared state fact.
const tasks = moduleStorage(objectStorage(StorageKinds, SpanishClient), "tasks", storageKindsModules.tasks);
const move = (id: string, expectedVersion: number, state: string): Change => ({ kind: "update", object: "task", id, expectedVersion, set: { state } });
const noReceipt = async () => undefined;

test("Q2 control: trash keeps the row and its references; the inverse action restores the same facts", async () => {
  const pool = await database(StorageKinds);
  const { task, project } = await seed(pool);
  await pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, 0)`, [task, project]);
  const facts = `SELECT title, priority, estimate, status, owner, tags, recording, due_note, state FROM ${schema}.task WHERE id = $1`;
  const before = (await pool.query(facts, [task])).rows[0];
  assert.deepEqual(await applyChanges(pool, tasks, [move(task, 1, "trashed")], noReceipt),
    { objects: [{ id: task, type: "task", version: 2, change: "updated" }] });
  assert.equal((await pool.query(facts, [task])).rows[0]?.state, "trashed");
  assert.equal(await rowCount(pool, `${schema}.task_projects`), 1, "a trashed object keeps its references");
  await applyChanges(pool, tasks, [move(task, 2, "active")], noReceipt);
  assert.deepEqual((await pool.query(facts, [task])).rows[0], before);
  assert.deepEqual((await pool.query(`SELECT version FROM ${schema}.task WHERE id = $1`, [task])).rows, [{ version: 3 }]);
});

test("Q2 negative: a state outside the declared ones is refused, and a row cannot leave by a plain DELETE while referenced", async () => {
  const pool = await database(StorageKinds);
  const { task, project } = await seed(pool);
  await pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, 0)`, [task, project]);
  await rejectsNamed(applyChanges(pool, tasks, [move(task, 1, "deleted")], noReceipt), "check_violation", "task_state_check");
  await applyChanges(pool, tasks, [move(task, 1, "trashed")], noReceipt);
  await rejectsNamed(pool.query(`DELETE FROM ${schema}.task WHERE id = $1`, [task]), "foreign_key_violation", "task_projects_object_id_fkey");
  await rejectsNamed(pool.query(`DELETE FROM ${schema}.project WHERE id = $1`, [project]), "foreign_key_violation", "task_projects_target_id_fkey");
  assert.equal(await rowCount(pool, `${schema}.task`), 1);
});

test("Q2: the generated storage has no trash record: no tombstone or trash table, no deleted column, no ON DELETE action", () => {
  const ddl = renderInfrastructureDdl() + renderObjectDdl(StorageKinds, SpanishClient);
  for (const word of ["on delete", "tombstone", "deleted"]) assert.equal(ddl.toLowerCase().includes(word), false, word);
  const names = [...infrastructureTables, ...objectStorage(StorageKinds, SpanishClient).tables]
    .flatMap(table => [table.name, ...table.columns.map(column => column.name)]);
  assert.deepEqual(names.filter(name => /trash|tombstone|deleted/.test(name)), []);
  // The one trace of the trash is the declared state fact: an ordinary enum column.
  assert.match(ddl, /"state" text NOT NULL CHECK \("state" IN \('active', 'trashed'\)\)/);
});
