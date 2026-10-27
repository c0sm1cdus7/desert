import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { storedObjects, storedTable } from "../src/testing/stored-objects.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function fixture() {
  const database = await cluster.database();
  const application = compile(Notebook);
  const host = await openLocalController(application, { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Owner");
  const session = host.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  return { database, application, notes: storedTable(application, "note"), host, identity, session, admin };
}

test("an exited process returning no result leaves a recoverable receipt without replay", async () => {
  const f = await fixture();
  try {
    const intent = await f.session.prepare((await f.session.begin("create-note")).id, { title: "Durable", body: "No response" });
    await new Promise<void>((resolve, reject) => {
      const worker = spawn(process.execPath, ["tests/fixtures/accept-without-response.ts"], { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      worker.stdout.on("data", chunk => { stdout += chunk; });
      worker.stderr.on("data", chunk => { stderr += chunk; });
      worker.on("error", reject);
      worker.on("close", code => {
        if (code !== 0 || stdout) reject(new Error(`Worker ${code}: ${stderr}`));
        else resolve();
      });
      worker.stdin.end(JSON.stringify({ database: f.database, token: f.identity.token,
        intentId: intent.id, confirmationDigest: intent.confirmationDigest }));
    });
    const receipt = await f.session.receipt(intent.id);
    assert.equal(receipt!.status, "completed");
    assert.equal((await storedObjects(f.admin, f.application)).length, 1);
    await f.admin.query("UPDATE desert_runs SET expires_at = clock_timestamp() - interval '1 second'");
    assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
    assert.equal((await storedObjects(f.admin, f.application)).length, 1);
    assert.equal((await f.admin.query("SHOW listen_addresses")).rows[0].listen_addresses, "");
  } finally { await f.admin.end(); await f.host.close(); }
});

test("a run expiring while waiting for an object lock cannot be accepted", async () => {
  const f = await fixture();
  const blocker = await f.admin.connect();
  try {
    const create = await f.session.prepare((await f.session.begin("create-note")).id, { title: "Expiry", body: "Under contention" });
    const created = await f.session.accept(create.id, create.confirmationDigest);
    const run = await f.session.begin("archive-note", created.object.id);
    const intent = await f.session.prepare(run.id, {});
    await blocker.query("BEGIN");
    await blocker.query(`SELECT * FROM ${f.notes} WHERE "id" = $1 FOR UPDATE`, [created.object.id]);
    await f.admin.query("UPDATE desert_runs SET expires_at = clock_timestamp() + interval '500 milliseconds' WHERE id = $1", [run.id]);
    const rejected = assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /RUN_EXPIRED/);
    let waiting = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const status = await f.admin.query(`SELECT count(*) FROM pg_stat_activity
        WHERE wait_event_type = 'Lock' AND query LIKE $1`, [`SELECT %FROM ${f.notes}%`]);
      if (Number(status.rows[0].count) > 0) { waiting = true; break; }
      await delay(10);
    }
    assert.equal(waiting, true);
    await delay(550);
    await blocker.query("COMMIT");
    await rejected;
    assert.equal((await storedObjects(f.admin, f.application))[0]!.facts.state, "active");
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "1");
  } finally { await blocker.query("ROLLBACK"); blocker.release(); await f.admin.end(); await f.host.close(); }
});
