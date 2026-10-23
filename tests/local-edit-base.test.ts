import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { EditingNotebook, EditNote } from "./fixtures/editing-notebook.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function fixture() {
  const database = await cluster.database();
  const host = await openLocalController(compile(EditingNotebook), { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Owner");
  const session = host.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  const seed = await session.prepare((await session.begin("create-note")).id, { title: "Original", body: "First body" });
  const receipt = await session.accept(seed.id, seed.confirmationDigest);
  const subject = receipt.object.id;
  const read = async () => (await session.read((await session.begin("read-note", subject)).id))[0]!;
  const begin = () => session.begin(EditNote.id, subject);
  const counts = async () => (await admin.query(`SELECT
    (SELECT count(*)::integer FROM desert_intents) AS intents,
    (SELECT count(*)::integer FROM desert_receipts) AS receipts`)).rows[0];
  return { host, session, subject, read, begin, counts,
    close: async () => { await admin.end(); await host.close(); } };
}

test("an input-bearing edit cannot prepare without its original positive integer revision", async () => {
  const f = await fixture();
  try {
    const run = await f.begin();
    const before = await f.counts();
    const input = { title: "Edited", body: "Changed" };
    await assert.rejects(f.session.prepare(run.id, input), /EDIT_BASE_REQUIRED/);
    for (const options of [null, {}, [], { expectedVersion: 0 }, { expectedVersion: -1 },
      { expectedVersion: 1.5 }, { expectedVersion: "1" }, { expectedVersion: Number.MAX_SAFE_INTEGER + 1 },
      { expectedVersion: 1, bypass: true }]) {
      await assert.rejects(f.session.prepare(run.id, input, options as never), /INVALID_EDIT_BASE/);
    }
    await assert.rejects(f.session.prepare(run.id, input, { expectedVersion: 42 }), /VERSION_CONFLICT/);
    assert.deepEqual(await f.counts(), before, "Invalid edit bases must not create intents or receipts");
    assert.equal((await f.read()).version, 1);
  } finally { await f.close(); }
});

test("an editor opened before another accepted change cannot prepare against the new record", async () => {
  const f = await fixture();
  try {
    const opened = await f.read();
    const oldEditor = await f.begin();
    const other = await f.session.prepare((await f.begin()).id,
      { title: "Newer", body: "Already saved" }, { expectedVersion: opened.version });
    await f.session.accept(other.id, other.confirmationDigest);
    const before = await f.counts();
    await assert.rejects(f.session.prepare(oldEditor.id,
      { title: "Stale", body: "Must not overwrite" }, { expectedVersion: opened.version }), /VERSION_CONFLICT/);
    assert.deepEqual(await f.counts(), before);
    assert.deepEqual(await f.read(), { id: f.subject, version: 2,
      facts: { title: "Newer", body: "Already saved", state: "active" } });
  } finally { await f.close(); }
});

test("same edit input and base retry the original intent, then acceptance still checks its base", async () => {
  const f = await fixture();
  try {
    const run = await f.begin();
    const input = { title: "First editor", body: "Same request" };
    const intent = await f.session.prepare(run.id, input, { expectedVersion: 1 });
    assert.equal(intent.object.expectedVersion, 1);
    const competing = await f.session.prepare((await f.begin()).id,
      { title: "Second editor", body: "Winner" }, { expectedVersion: 1 });
    await f.session.accept(competing.id, competing.confirmationDigest);
    assert.deepEqual(await f.session.prepare(run.id, { body: input.body, title: input.title }, { expectedVersion: 1 }), intent);
    await assert.rejects(f.session.prepare(run.id, input, { expectedVersion: 2 }), /INTENT_CONFLICT/);
    await assert.rejects(f.session.prepare(run.id, { ...input, body: "Different" }, { expectedVersion: 1 }), /INTENT_CONFLICT/);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /VERSION_CONFLICT/);
    assert.equal(await f.session.receipt(intent.id), null);
    assert.equal((await f.read()).facts.title, "Second editor");
  } finally { await f.close(); }
});

test("accepted edit retries and receipt recovery preserve the single committed revision", async () => {
  const f = await fixture();
  try {
    const run = await f.begin();
    const input = { title: "Edited", body: "Durable change" };
    const options = { expectedVersion: 1 };
    const pending = f.session.prepare(run.id, input, options);
    options.expectedVersion = 99;
    const intent = await pending;
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
    assert.deepEqual(await f.session.receipt(intent.id), receipt);
    assert.deepEqual(await f.session.prepare(run.id, input, { expectedVersion: 1 }), intent);
    assert.equal((await f.read()).version, 2);
    assert.deepEqual(await f.counts(), { intents: 2, receipts: 2 });
  } finally { await f.close(); }
});

test("create has no edit base and existing zero-input archive remains compatible", async () => {
  const f = await fixture();
  try {
    const create = await f.session.begin("create-note");
    await assert.rejects(f.session.prepare(create.id, { title: "New", body: "Body" }, { expectedVersion: 1 }), /INVALID_EDIT_BASE/);
    const run = await f.session.begin("archive-note", f.subject);
    await assert.rejects(f.session.prepare(run.id, {}, { expectedVersion: 2 }), /VERSION_CONFLICT/);
    const intent = await f.session.prepare(run.id, {});
    assert.deepEqual(await f.session.prepare(run.id, {}, { expectedVersion: 1 }), intent);
    await f.session.accept(intent.id, intent.confirmationDigest);
    assert.equal((await f.read()).facts.state, "archived");
  } finally { await f.close(); }
});
