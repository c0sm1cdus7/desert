import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { dispatch } from "../src/web/dispatch.ts";
import { Notebook } from "../products/notebook/product.ts";
import { CreateNote, ArchiveNote } from "../products/notebook/journeys.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function setup() {
  const database = await cluster.database();
  const host = await openLocalController(compile(Notebook), { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Alice");
  const session = host.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  async function effects() {
    const result: Record<string, number> = {};
    for (const name of ["objects", "runs", "intents", "receipts"]) {
      result[name] = Number((await admin.query(`SELECT count(*) FROM desert_${name}`)).rows[0].count);
    }
    return result;
  }
  return { host, session, identity, admin, effects,
    async close() { await admin.end(); await host.close(); } };
}

test("incomplete preflight reports canonical missing inputs without admitting or preparing", async () => {
  const f = await setup();
  try {
    const before = await f.effects();
    const result = await f.session.preflight(CreateNote.id, { title: "A draft" });
    assert.equal(result.status, "incomplete");
    assert.deepEqual(result.missing, ["body"]);
    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.blockers, []);
    assert.deepEqual(await f.effects(), before);
  } finally { await f.close(); }
});

test("ready preflight is read-only and does not substitute for explicit preparation and acceptance", async () => {
  const f = await setup();
  try {
    const result = await dispatch(f.session, "preflight", {
      journeyId: CreateNote.id, input: { title: "Ready", body: "Still not saved" },
    });
    assert.equal(result.status, "ready");
    assert.deepEqual(await f.effects(), { objects: 0, runs: 0, intents: 0, receipts: 0 });
    const run = await f.session.begin(CreateNote.id);
    const intent = await f.session.prepare(run.id, { title: "Ready", body: "Explicit save" });
    assert.deepEqual(await f.effects(), { objects: 0, runs: 1, intents: 1, receipts: 0 });
    assert.equal((await f.session.accept(intent.id, intent.confirmationDigest)).status, "completed");
  } finally { await f.close(); }
});

test("preflight preserves canonical invalid-input diagnostics and rejects unknown transport semantics", async () => {
  const f = await setup();
  try {
    const result = await f.session.preflight(CreateNote.id, { title: 42, body: "Known", secret: "ignored?" });
    assert.equal(result.status, "invalid");
    assert.ok(result.issues.some(issue => issue.keyword === "type" && issue.instancePath === "/title"));
    assert.ok(result.issues.some(issue => issue.keyword === "additionalProperties"));
    assert.throws(() => dispatch(f.session, "preflight", {
      journeyId: CreateNote.id, input: {}, actor: "someone-else",
    }), /INVALID_REQUEST/);
    assert.deepEqual(await f.effects(), { objects: 0, runs: 0, intents: 0, receipts: 0 });
  } finally { await f.close(); }
});

test("subject preflight applies owner, live state and revocation checks without exposing private facts", async () => {
  const f = await setup();
  try {
    const create = await f.session.begin(CreateNote.id);
    const intent = await f.session.prepare(create.id, { title: "Private", body: "Never in preflight" });
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    const before = await f.effects();
    const allowed = await f.session.preflight(ArchiveNote.id, {}, { subject: receipt.object.id });
    assert.equal(allowed.status, "ready");
    assert.equal(JSON.stringify(allowed).includes("Never in preflight"), false);
    const bob = await f.host.identities.issue("Bob");
    await assert.rejects(f.host.connect(bob.token, "human").preflight(ArchiveNote.id, {},
      { subject: receipt.object.id }), /NOT_FOUND/);
    assert.deepEqual(await f.effects(), before);
    const archive = await f.session.prepare((await f.session.begin(ArchiveNote.id, receipt.object.id)).id, {});
    await f.session.accept(archive.id, archive.confirmationDigest);
    assert.deepEqual((await f.session.preflight(ArchiveNote.id, {}, { subject: receipt.object.id })).blockers,
      ["PRECONDITION_FAILED"]);
    await f.host.identities.revoke(f.identity.id);
    await assert.rejects(f.session.preflight(CreateNote.id, {}), /UNAUTHENTICATED/);
  } finally { await f.close(); }
});

test("preflight cannot inspect unexposed operations or silently reinterpret subjects", async () => {
  const f = await setup();
  try {
    await assert.rejects(f.session.preflight("not-installed", {}), /JOURNEY_NOT_EXPOSED/);
    await assert.rejects(f.session.preflight(ArchiveNote.id, {}), /SUBJECT_REQUIRED/);
    await assert.rejects(f.session.preflight(CreateNote.id, {}, { subject: "unexpected" }), /UNEXPECTED_SUBJECT/);
    assert.deepEqual(await f.effects(), { objects: 0, runs: 0, intents: 0, receipts: 0 });
  } finally { await f.close(); }
});
