import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { StorageKinds } from "./fixtures/storage-kinds.ts";
import { database, insertTask, rejectsNamed, schema, seed, taskValues } from "./support/storage-database.ts";

// A fact value that violates its declaration is rejected by Postgres itself, with a named constraint.
test("control: a task with valid facts is stored and read back exactly", async () => {
  const pool = await database(StorageKinds);
  const { task, owner } = await seed(pool);
  const { rows } = await pool.query(`SELECT title, priority, status, owner, tags, due_note FROM ${schema}.task WHERE id = $1`, [task]);
  assert.deepEqual(rows, [{ title: "Write", priority: "3", status: "open", owner, tags: ["a"], due_note: "" }]);
});

test("Postgres rejects a text fact outside its declared length", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, title: "too long!" })), "check_violation", "task_title_check");
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, title: "" })), "check_violation", "task_title_check");
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, dueNote: "four" })), "check_violation", "task_due_note_check");
});

test("Postgres rejects an integer fact outside its declared range, including the default safe-integer range", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, priority: 6 })), "check_violation", "task_priority_check");
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, priority: 0 })), "check_violation", "task_priority_check");
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, estimate: "9007199254740992" })), "check_violation", "task_estimate_check");
});

test("Postgres rejects an enum fact outside its declared set", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, status: "archived" })), "check_violation", "task_status_check");
});

test("Postgres rejects labels beyond their declared count, length or canonical form", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  for (const tags of [["a", "b", "c"], ["toolong"], ["a", "a"], [" a"], [""]]) {
    await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, tags })), "check_violation", "task_tags_check");
  }
});

test("Postgres rejects a version that is not positive", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: asset, version: 0 })), "check_violation", "task_version_check");
});

test("Postgres rejects a dangling principal, asset or reference", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset, task } = await seed(pool);
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner: randomUUID(), recording: asset })), "foreign_key_violation", "task_owner_fkey");
  await rejectsNamed(pool.query(insertTask, taskValues({ id: randomUUID(), owner, recording: randomUUID() })), "foreign_key_violation", "task_recording_fkey");
  await rejectsNamed(pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, 0)`, [task, randomUUID()]),
    "foreign_key_violation", "task_projects_target_id_fkey");
  await rejectsNamed(pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, 0)`, [randomUUID(), randomUUID()]),
    "foreign_key_violation", "task_projects_object_id_fkey");
});

test("Postgres rejects a duplicate of a declared unique set", async () => {
  const pool = await database(StorageKinds);
  const { owner } = await seed(pool);
  await rejectsNamed(pool.query(`INSERT INTO ${schema}.project (id, version, name, color, owner) VALUES ($1, 1, 'Home', 'rose', $2)`, [randomUUID(), owner]),
    "unique_violation", "project_owner_name_key");
});
