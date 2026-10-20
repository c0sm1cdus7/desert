import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function fixture(source: unknown = Notebook) {
  const database = await cluster.database();
  const app = compile(source);
  const host = await openLocalController(app, { ...database, role: "notes" });
  const identity = await host.identities.issue("Owner");
  const session = host.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  return { database, app, host, identity, session, admin,
    close: async () => { await admin.end(); await host.close(); } };
}

test("invalid input, forged confirmation and wrong run kind never write a note", async () => {
  const f = await fixture();
  try {
    const run = await f.session.begin("create-note");
    await assert.rejects(f.session.prepare(run.id, { title: "Hi", body: "", owner: f.identity.id }), /INVALID_INPUT/);
    const intent = await f.session.prepare(run.id, { title: "Hi", body: "Valid" });
    await assert.rejects(f.session.accept(intent.id, "invented"), /CONFIRMATION_MISMATCH/);
    await assert.rejects(f.session.accept(randomUUID(), intent.confirmationDigest), /NOT_FOUND/);
    await assert.rejects(f.session.read(run.id), /NOT_A_READ_JOURNEY/);
    const read = await f.session.begin("read-note");
    await assert.rejects(f.session.prepare(read.id, {}), /NOT_A_MUTATION_JOURNEY/);
    await assert.rejects(f.session.prepare(run.id, { title: "Changed", body: "Valid" }), /INTENT_CONFLICT/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
    assert.deepEqual(await f.session.prepare(run.id, { body: "Valid", title: "Hi" }), intent);
    await f.session.accept(intent.id, intent.confirmationDigest);
    assert.equal((await f.admin.query("SELECT facts ->> 'owner' AS owner FROM desert_objects")).rows[0].owner, f.identity.id);
  } finally { await f.close(); }
});

test("revocation and expiration are enforced after preparation, with no partial effects", async () => {
  for (const reason of ["revoked", "identity-expired", "run-expired"]) {
    const f = await fixture();
    try {
      const run = await f.session.begin("create-note");
      const intent = await f.session.prepare(run.id, { title: "Hi", body: "Valid" });
      if (reason === "revoked") await f.host.identities.revoke(f.identity.id);
      if (reason === "identity-expired") await f.admin.query("UPDATE desert_identities SET expires_at = clock_timestamp() - interval '1 second'");
      if (reason === "run-expired") await f.admin.query("UPDATE desert_runs SET expires_at = clock_timestamp() - interval '1 second'");
      await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /UNAUTHENTICATED|RUN_EXPIRED/);
      assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
      assert.equal((await f.admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "0");
    } finally { await f.close(); }
  }
});

test("surface binding, exact installation digest and declared dependency support cannot be bypassed", async () => {
  const f = await fixture();
  try {
    const run = await f.session.begin("create-note");
    const intent = await f.session.prepare(run.id, { title: "Hi", body: "Valid" });
    const agent = f.host.connect(f.identity.token, "agent");
    await assert.rejects(agent.accept(intent.id, intent.confirmationDigest), /NOT_FOUND/);
    await assert.rejects(f.session.begin("invented-journey"), /JOURNEY_NOT_EXPOSED/);
    const changed = structuredClone(Notebook);
    changed.objects[0]!.facts.title.minLength = 2;
    await assert.rejects(openLocalController(compile(changed), { ...f.database, role: "notes" }), /INSTALLATION_MISMATCH/);
    const unsupported = structuredClone(Notebook) as any;
    unsupported.dependencies.push({ id: "provider", kind: "capability", requires: [] });
    unsupported.journeys[0].requires.dependencies.push("provider");
    await assert.rejects(openLocalController(compile(unsupported), { ...f.database, role: "notes" }), /UNSUPPORTED_LOCAL_DEPENDENCY/);
    await assert.rejects(openLocalController({ ...f.app }, { ...f.database, role: "notes" }), /UNCOMPILED_APPLICATION/);
    await assert.rejects(openLocalController(f.app, { ...f.database, socketDirectory: "localhost", role: "notes" }), /LOCAL_SOCKET_REQUIRED/);
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_objects")).rows[0].count, "0");
  } finally { await f.close(); }
});

test("changing only contract effects changes execution without Notebook branches in the engine", async () => {
  const source = structuredClone(Notebook) as any;
  source.objects[0].facts.state.values = ["active", "filed"];
  source.journeys[2].command.set.state.value = "filed";
  const f = await fixture(source);
  try {
    const intent = await f.session.prepare((await f.session.begin("create-note")).id, { title: "Contract", body: "Driven" });
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    const archive = await f.session.prepare((await f.session.begin("archive-note", receipt.object.id)).id, {});
    await f.session.accept(archive.id, archive.confirmationDigest);
    const records = await f.session.read((await f.session.begin("read-note", receipt.object.id)).id);
    assert.equal(records[0]!.facts.state, "filed");
    const repeat = await f.session.begin("archive-note", receipt.object.id);
    await assert.rejects(f.session.prepare(repeat.id, {}), /PRECONDITION_FAILED/);
  } finally { await f.close(); }
});
