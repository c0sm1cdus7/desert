import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { StorageKinds } from "./fixtures/storage-kinds.ts";
import { database, insertTask, rejectsNamed, schema, seed, taskValues, waitingOnLock } from "./support/storage-database.ts";

// The maxItems of a reference fact is a constraint trigger on its join table (src/storage/render-ddl.ts renderLimit).
test("the join-table constraint trigger enforces maxItems (references: 12, mediaReferences: 1)", async () => {
  const pool = await database(StorageKinds);
  const { owner, task, asset } = await seed(pool);
  const projects = Array.from({ length: 13 }, () => randomUUID());
  for (const project of projects) await pool.query(`INSERT INTO ${schema}.project (id, version, name, color, owner) VALUES ($1, 1, $2, 'blue', $3)`, [project, project.slice(0, 8), owner]);
  for (const [position, project] of projects.slice(0, 12).entries()) {
    await pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, $3)`, [task, project, position]);
  }
  await rejectsNamed(pool.query(`INSERT INTO ${schema}.task_projects (object_id, target_id, position) VALUES ($1, $2, 12)`, [task, projects[12]]),
    "check_violation", "task_projects_object_id_limit", /^STORAGE_MAX_ITEMS: product_storage_kinds\.task_projects: more than 12 rows for object_id /);
  const album = randomUUID(), photos = [randomUUID(), randomUUID()];
  await pool.query(`INSERT INTO ${schema}.photo_album (id, version, title, owner) VALUES ($1, 1, 'Trip', $2)`, [album, owner]);
  for (const photo of photos) await pool.query(`INSERT INTO ${schema}.album_photo (id, version, title, image, owner) VALUES ($1, 1, '', $2, $3)`, [photo, asset, owner]);
  await pool.query(`INSERT INTO ${schema}.photo_album_cover (object_id, target_id, position) VALUES ($1, $2, 0)`, [album, photos[0]]);
  await rejectsNamed(pool.query(`INSERT INTO ${schema}.photo_album_cover (object_id, target_id, position) VALUES ($1, $2, 1)`, [album, photos[1]]),
    "check_violation", "photo_album_cover_object_id_limit", /^STORAGE_MAX_ITEMS: /);
});

test("the maxItems trigger also holds when a row moves to a full object, and between concurrent transactions", async () => {
  const pool = await database(StorageKinds);
  const { owner, asset } = await seed(pool);
  const [full, other] = [randomUUID(), randomUUID()], [first, second] = [randomUUID(), randomUUID()];
  for (const id of [full, other]) await pool.query(insertTask, taskValues({ id, owner, recording: asset }));
  const album = randomUUID();
  await pool.query(`INSERT INTO ${schema}.photo_album (id, version, title, owner) VALUES ($1, 1, 'Trip', $2)`, [album, owner]);
  const albumTwo = randomUUID();
  await pool.query(`INSERT INTO ${schema}.photo_album (id, version, title, owner) VALUES ($1, 1, 'Home', $2)`, [albumTwo, owner]);
  for (const photo of [first, second]) await pool.query(`INSERT INTO ${schema}.album_photo (id, version, title, image, owner) VALUES ($1, 1, '', $2, $3)`, [photo, asset, owner]);
  await pool.query(`INSERT INTO ${schema}.photo_album_cover (object_id, target_id, position) VALUES ($1, $2, 0), ($3, $4, 0)`, [album, first, albumTwo, second]);
  await rejectsNamed(pool.query(`UPDATE ${schema}.photo_album_cover SET object_id = $1, position = 1 WHERE object_id = $2`, [album, albumTwo]),
    "check_violation", "photo_album_cover_object_id_limit");
  await pool.query(`DELETE FROM ${schema}.photo_album_cover WHERE object_id = $1`, [album]);
  // Two transactions each add one cover to the same empty album: the second waits for the first, then counts it.
  const [left, right] = [await pool.connect(), await pool.connect()];
  try {
    await left.query("BEGIN");
    await right.query("BEGIN");
    await left.query(`INSERT INTO ${schema}.photo_album_cover (object_id, target_id, position) VALUES ($1, $2, 0)`, [album, first]);
    const racing = right.query(`INSERT INTO ${schema}.photo_album_cover (object_id, target_id, position) VALUES ($1, $2, 1)`, [album, second]);
    racing.catch(() => undefined); // observed below, after the first transaction commits
    assert.equal(await waitingOnLock(pool), true, "the second insert waits for the first transaction's lock on the album");
    await left.query("COMMIT");
    await rejectsNamed(racing, "check_violation", "photo_album_cover_object_id_limit");
    await right.query("ROLLBACK");
  } finally { left.release(); right.release(); }
  assert.equal(Number((await pool.query<{ count: string }>(`SELECT count(*) FROM ${schema}.photo_album_cover WHERE object_id = $1`, [album])).rows[0]?.count), 1);
});
