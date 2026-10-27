import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { storedObjects } from "../src/testing/stored-objects.ts";
import { renderWriteFault, renderWriteFaultRemoval } from "../src/storage/render-faults.ts";
import { receiptsTable } from "../src/storage/tables/local.ts";
import type { LocalSession } from "../src/local.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function setup() {
  const database = await cluster.database();
  const app = compile(Notebook);
  const host = await openLocalController(app, { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Alice");
  const alice = host.connect(identity.token, "human");
  return { app, database, host, identity, alice };
}

async function create(alice: LocalSession, title = "Offline idea") {
  const run = await alice.begin("create-note");
  const intent = await alice.prepare(run.id, { title, body: "Written locally." });
  const receipt = await alice.accept(intent.id, intent.confirmationDigest);
  return { intent, receipt };
}

test("Notebook creates, reads and archives real notes through admitted journeys", async () => {
  const { host, alice } = await setup();
  try {
    const { receipt } = await create(alice);
    const read = await alice.begin("read-note", receipt.object.id);
    assert.deepEqual((await alice.read(read.id))[0]!.facts,
      { title: "Offline idea", body: "Written locally.", state: "active" });
    const archive = await alice.begin("archive-note", receipt.object.id);
    const intent = await alice.prepare(archive.id, {});
    await alice.accept(intent.id, intent.confirmationDigest);
    assert.equal((await alice.read(read.id))[0]!.facts.state, "archived");
  } finally { await host.close(); }
});

test("identity and ownership are checked on reads, runs and acceptance", async () => {
  const { host, alice } = await setup();
  try {
    const bobIdentity = await host.identities.issue("Bob");
    const bob = host.connect(bobIdentity.token, "human");
    const run = await alice.begin("create-note");
    const intent = await alice.prepare(run.id, { title: "Private", body: "Alice only" });
    await assert.rejects(bob.prepare(run.id, { title: "Injected", body: "Wrong actor" }), /NOT_FOUND/);
    await assert.rejects(bob.accept(intent.id, intent.confirmationDigest), /NOT_FOUND/);
    const receipt = await alice.accept(intent.id, intent.confirmationDigest);
    assert.deepEqual(await bob.read((await bob.begin("read-note")).id), []);
    await assert.rejects(bob.begin("archive-note", receipt.object.id), /NOT_FOUND/);
    await assert.rejects(bob.offer("archive-note", receipt.object.id), /NOT_FOUND/);
    await assert.rejects(host.connect("forged", "human").begin("read-note"), /UNAUTHENTICATED/);
  } finally { await host.close(); }
});

test("subject offers consume the same guard as acceptance, without granting authority", async () => {
  const { host, alice } = await setup();
  try {
    const { receipt } = await create(alice);
    assert.equal((await alice.offer("archive-note", receipt.object.id)).eligible, true);
    const intent = await alice.prepare((await alice.begin("archive-note", receipt.object.id)).id, {});
    await alice.accept(intent.id, intent.confirmationDigest);
    assert.equal((await alice.offer("archive-note", receipt.object.id)).eligible, false);
    await assert.rejects(alice.prepare((await alice.begin("archive-note", receipt.object.id)).id, {}), /PRECONDITION_FAILED/);
  } finally { await host.close(); }
});

test("effect and receipt roll back together when PostgreSQL rejects the receipt", async () => {
  const { app, database, host, alice } = await setup();
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  try {
    const run = await alice.begin("create-note");
    const intent = await alice.prepare(run.id, { title: "Atomic", body: "No partial write" });
    const fault = { name: "receipt_fault", event: "INSERT", message: "receipt fault" } as const;
    await admin.query(renderWriteFault(receiptsTable, fault));
    await assert.rejects(alice.accept(intent.id, intent.confirmationDigest), /receipt fault/);
    assert.equal((await storedObjects(admin, app)).length, 0);
    assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "0");
    await admin.query(renderWriteFaultRemoval(receiptsTable, fault));
    const receipt = await alice.accept(intent.id, intent.confirmationDigest);
    assert.equal(receipt.status, "completed");
  } finally { await admin.end(); await host.close(); }
});

test("concurrent retries return one receipt, while competing prepared versions conflict", async () => {
  const { host, alice } = await setup();
  try {
    const run = await alice.begin("create-note");
    const intent = await alice.prepare(run.id, { title: "Concurrent", body: "Accept once" });
    const retries = await Promise.all([alice.accept(intent.id, intent.confirmationDigest), alice.accept(intent.id, intent.confirmationDigest)]);
    const receipt = retries[0]!;
    assert.deepEqual(retries, [receipt, receipt]);
    const records = await alice.read((await alice.begin("read-note")).id);
    assert.equal(records.length, 1);
    assert.equal(records[0]!.version, 1);
    const first = await alice.prepare((await alice.begin("archive-note", receipt.object.id)).id, {});
    const second = await alice.prepare((await alice.begin("archive-note", receipt.object.id)).id, {});
    const outcomes = await Promise.allSettled([alice.accept(first.id, first.confirmationDigest), alice.accept(second.id, second.confirmationDigest)]);
    assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
    const rejected = outcomes.find(result => result.status === "rejected");
    assert.match(String((rejected as PromiseRejectedResult).reason), /VERSION_CONFLICT/);
  } finally { await host.close(); }
});

test("notes, identity and receipt survive a database and controller restart", async () => {
  const { app, database, host, identity, alice } = await setup();
  const { receipt, intent } = await create(alice);
  await host.close();
  cluster.stop();
  cluster.start();
  const reopened = await openLocalController(app, { ...database, roles: ["notes"] });
  try {
    const session = reopened.connect(identity.token, "human");
    assert.deepEqual(await session.receipt(intent.id), receipt);
    const notes = await session.read((await session.begin("read-note")).id);
    assert.equal(notes[0]!.id, receipt.object.id);
    assert.equal(notes[0]!.facts.title, "Offline idea");
  } finally { await reopened.close(); }
});
