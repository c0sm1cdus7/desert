import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseError, Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { localProgram } from "../src/local/program.ts";
import { writeEffect } from "../src/local/accept.ts";
import type { Effect } from "../src/local/types.ts";
import { assetReference } from "../src/assets/types.ts";
import { applyChanges, moduleStorage } from "../src/storage/change-set.ts";
import { objectStorage } from "../src/storage/ddl.ts";
import { readObjects, storedObject } from "../src/storage/object-store.ts";
import { namedViolation } from "../src/storage/violations.ts";
import { testInstallation } from "../src/testing/installation.ts";
import { postgresCluster } from "../src/testing/postgres-cluster.ts";
import { storedObjects } from "../src/testing/stored-objects.ts";
import { controllerErrorCode } from "../src/web/errors.ts";
import { Notebook } from "../products/notebook/product.ts";
import { CreateNote } from "../products/notebook/journeys.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { SpanishClient, StorageKinds, storageKindsModules } from "./fixtures/storage-kinds.ts";
import { database as storageDatabase, seed } from "./support/storage-database.ts";

// Plan §15, step 7.2: Postgres enforces the declaration too, and when it refuses a write the caller sees a named code —
// the one both transports pass to a person unchanged (src/web/errors.ts; HTTP answers it 409, never 503) — never a bare
// database failure that would surface as CONTROLLER_UNAVAILABLE.
const cluster = postgresCluster();
const pools: Pool[] = [];
test.after(async () => { await Promise.all(pools.map(pool => pool.end())); cluster.dispose(); });
const admin = (database: Readonly<{ socketDirectory: string; database: string; user: string }>) => {
  const pool = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
  pools.push(pool);
  return pool;
};
const named = (code: string, state: string, constraint: string) => (error: unknown) => {
  assert.ok(error instanceof Error && error.message === code, String(error));
  assert.ok(error.cause instanceof DatabaseError, "the Postgres error is the cause");
  assert.equal(error.cause.code, state);
  assert.equal(error.cause.constraint, constraint);
  assert.equal(controllerErrorCode(error), code);
  return true;
};

const [memo, ...others] = SharedProduct.objects;
const UniqueMemos = { ...SharedProduct, objects: [{ ...memo!, unique: [["owner", "title"]] }, ...others] };

test("UNIQUE_CONFLICT: a declared unique set is served, and the repeat is refused by Postgres with a named code and no partial write", async () => {
  const database = await cluster.database(), application = compile(UniqueMemos);
  const host = await openLocalController(application, { ...database, roles: ["workspace"] });
  try {
    const alice = await host.identities.issue("Alice"), bob = await host.identities.issue("Bob");
    const create = async (token: string, title: string) => {
      const session = host.connect(token, "agent");
      const intent = await session.prepare((await session.begin("create-memo")).id, { title });
      return { session, intent };
    };
    const first = await create(alice.token, "Plan");
    assert.equal((await first.session.accept(first.intent.id, first.intent.confirmationDigest)).status, "completed");
    // Control: the same title for another owner, and another title for the same owner, are different unique values.
    for (const [token, title] of [[bob.token, "Plan"], [alice.token, "Other"]] as const) {
      const other = await create(token, title);
      assert.equal((await other.session.accept(other.intent.id, other.intent.confirmationDigest)).status, "completed");
    }
    const repeat = await create(alice.token, "Plan");
    await assert.rejects(repeat.session.accept(repeat.intent.id, repeat.intent.confirmationDigest), named("UNIQUE_CONFLICT", "23505", "memo_owner_title_key"));
    // The refusal is stable: a retry of the same intent is refused the same way and nothing was written.
    await assert.rejects(repeat.session.accept(repeat.intent.id, repeat.intent.confirmationDigest), named("UNIQUE_CONFLICT", "23505", "memo_owner_title_key"));
    assert.equal(await repeat.session.receipt(repeat.intent.id), null);
    const pool = admin(database);
    assert.deepEqual((await storedObjects(pool, application)).map(object => object.facts.title).sort(), ["Other", "Plan", "Plan"]);
    assert.equal((await pool.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "3");
  } finally { await host.close(); }
});

test("STORAGE_CONSTRAINT: a check or foreign-key violation the application did not catch is a named code, never a bare failure", async () => {
  const database = await cluster.database(), application = compile(Notebook);
  const host = await openLocalController(application, { ...database, roles: ["notes"] });
  const program = localProgram(application, ["notes"], testInstallation);
  const journey = program.journey("human", CreateNote.id);
  if (journey.kind !== "mutation") throw new Error("CreateNote is a mutation");
  const owner = (await host.identities.issue("Owner")).id;
  const effect = (facts: Effect["facts"]): Effect => ({ kind: "create", objectType: "note", objectId: randomUUID(), expectedVersion: 0, facts });
  const pool = admin(database);
  const client = await pool.connect();
  try {
    const attempt = async (facts: Effect["facts"]) => {
      await client.query("BEGIN");
      try { return await writeEffect(client, program, journey, effect(facts)); } finally { await client.query("ROLLBACK"); }
    };
    // Control: the same write with valid facts succeeds (and is rolled back by the harness).
    assert.equal(await attempt({ title: "Valid", body: "Body", owner, state: "active" }), 1);
    await assert.rejects(attempt({ title: "", body: "Body", owner, state: "active" }), named("STORAGE_CONSTRAINT", "23514", "note_title_check"));
    await assert.rejects(attempt({ title: "T", body: "Body", owner, state: "deleted" }), named("STORAGE_CONSTRAINT", "23514", "note_state_check"));
    await assert.rejects(attempt({ title: "T", body: "Body", owner: randomUUID(), state: "active" }), named("STORAGE_CONSTRAINT", "23503", "note_owner_fkey"));
    assert.equal((await storedObjects(pool, application)).length, 0);
  } finally { client.release(); await host.close(); }
});

test("a reference fact round-trips through its join table in order, and its declared limit is a named STORAGE_CONSTRAINT", async () => {
  const pool = await storageDatabase(StorageKinds);
  const { owner, asset } = await seed(pool);
  const storage = objectStorage(StorageKinds, SpanishClient), albums = moduleStorage(storage, "albums", storageKindsModules.albums);
  const none = async () => undefined;
  const photo = (title: string) => ({ kind: "create", object: "album-photo", id: randomUUID(),
    facts: { title, image: assetReference(asset), owner, albums: [] } }) as const;
  const [second, first] = [photo("Second"), photo("First")];
  await applyChanges(pool, albums, [second, first], none);
  const album = randomUUID();
  await applyChanges(pool, albums, [{ kind: "create", object: "photo-album", id: album, facts: { title: "Trip", owner, cover: [first.id] } }], none);
  await applyChanges(pool, albums, [{ kind: "update", object: "album-photo", id: second.id, expectedVersion: 1, set: { albums: [album] } }], none);
  const [stored] = await readObjects(pool, storedObject(storage, "album-photo"), { id: second.id });
  assert.deepEqual(stored, { id: second.id, object_type: "album-photo", version: 2,
    facts: { title: "Second", image: { kind: "asset", reference: asset }, owner, albums: [album] } });
  assert.deepEqual((await readObjects(pool, storedObject(storage, "photo-album"), { owner }))[0]?.facts.cover, [first.id]);
  const tooMany = applyChanges(pool, albums, [{ kind: "update", object: "photo-album", id: album, expectedVersion: 1, set: { cover: [first.id, second.id] } }], none);
  await assert.rejects(tooMany.catch(error => { throw namedViolation(error); }), (error: unknown) => {
    assert.ok(error instanceof Error && error.message === "STORAGE_CONSTRAINT", String(error));
    assert.ok(error.cause instanceof DatabaseError && /^STORAGE_MAX_ITEMS: /.test(error.cause.message), String(error.cause));
    return true;
  });
  assert.deepEqual((await readObjects(pool, storedObject(storage, "photo-album"), { id: album }))[0]?.facts.cover, [first.id], "nothing of the refused change remains");
});

test("namedViolation names only declaration violations: any other database failure stays itself", () => {
  const failure = (code: string) => Object.assign(new DatabaseError("refused", 1, "error"), { code });
  assert.equal((namedViolation(failure("23505")) as Error).message, "UNIQUE_CONFLICT");
  for (const code of ["23503", "23514", "23502", "22P02", "22003"]) assert.equal((namedViolation(failure(code)) as Error).message, "STORAGE_CONSTRAINT");
  const syntax = failure("42601"), plain = new Error("NOT_FOUND");
  assert.equal(namedViolation(syntax), syntax);
  assert.equal(namedViolation(plain), plain);
  assert.equal(controllerErrorCode(syntax), "CONTROLLER_UNAVAILABLE");
});
