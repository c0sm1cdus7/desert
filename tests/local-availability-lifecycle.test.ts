import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { storedObjects } from "../src/testing/stored-objects.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function fixture(lifetime = 60000) {
  const database = await cluster.database();
  const application = compile(Notebook);
  const host = await openLocalController(application, { ...database, roles: ["notes"] });
  const identity = await host.identities.issue("Owner", lifetime);
  const session = host.connect(identity.token, "human");
  const admin = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
  return { host, application, session, admin,
    close: async () => { await host.close(); await admin.end(); } };
}

async function eventually(condition: () => boolean) {
  for (let attempt = 0; attempt < 500; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("Runtime observation did not converge");
}

test("installation drift blocks both observation and execution, then recovers without writing business data", async () => {
  const f = await fixture();
  try {
    const availability = f.session.watchAvailability({ pollIntervalMs: 30, validForMs: 300 });
    const ready = () => availability.snapshot().journeys["create-note"]!.dependenciesReady;
    await eventually(ready);
    await f.admin.query("UPDATE desert_installation SET installation_digest = $1", ["f".repeat(64)]);
    await eventually(() => availability.snapshot().journeys["create-note"]!.blockers[0]?.reason === "incompatible");
    await assert.rejects(f.session.begin("create-note"), /INSTALLATION_MISMATCH/);
    await f.admin.query("UPDATE desert_installation SET installation_digest = $1", [f.application.digest]);
    await eventually(ready);
    assert.equal((await storedObjects(f.admin, f.application)).length, 0);
    for (const table of ["desert_runs", "desert_intents", "desert_receipts"]) {
      assert.equal((await f.admin.query(`SELECT count(*) FROM ${table}`)).rows[0].count, "0");
    }
    assert.equal("begin" in availability, false);
    assert.equal("ready" in availability, false);
  } finally { await f.close(); }
});

test("a blocked real probe expires prior evidence and cannot revive a disposed observer", async () => {
  const f = await fixture();
  const blocker = await f.admin.connect();
  try {
    const availability = f.session.watchAvailability({ pollIntervalMs: 30, validForMs: 200 });
    let notifications = 0;
    availability.subscribe(() => { notifications++; });
    await eventually(() => availability.snapshot().journeys["read-note"]!.dependenciesReady);
    await blocker.query("BEGIN; LOCK TABLE desert_installation IN ACCESS EXCLUSIVE MODE");
    await eventually(() => availability.snapshot().journeys["read-note"]!.blockers[0]?.reason === "stale");
    availability.dispose();
    const delivered = notifications;
    await blocker.query("COMMIT");
    await delay(250);
    assert.equal(notifications, delivered);
    assert.equal(availability.snapshot().journeys["read-note"]!.blockers[0]?.reason, "disposed");
    assert.throws(() => availability.subscribe(() => {}), /disposed/);
    const recovered = f.session.watchAvailability({ pollIntervalMs: 30, validForMs: 200 });
    await eventually(() => recovered.snapshot().journeys["read-note"]!.dependenciesReady);
    await f.host.close();
    assert.equal(recovered.snapshot().journeys["read-note"]!.blockers[0]?.reason, "disposed");
    assert.throws(() => f.session.watchAvailability(), /CONTROLLER_CLOSED/);
    await assert.rejects(f.session.begin("read-note"), /CONTROLLER_CLOSED/);
    assert.throws(() => f.host.connect("unused", "human"), /CONTROLLER_CLOSED/);
  } finally { await blocker.query("ROLLBACK"); blocker.release(); await f.close(); }
});

test("a real credential expiry updates human and agent observers without navigation or domain writes", async () => {
  const f = await fixture(300);
  try {
    const availability = f.session.watchAvailability({ pollIntervalMs: 25, validForMs: 100 });
    await eventually(() => availability.snapshot().journeys["read-note"]!.dependenciesReady);
    await eventually(() => availability.snapshot().journeys["read-note"]!.blockers[0]?.reason === "session-required");
    const identity = await f.host.identities.issue("Agent session");
    const agent = f.host.connect(identity.token, "agent").watchAvailability({ pollIntervalMs: 25, validForMs: 100 });
    await eventually(() => agent.snapshot().journeys["read-note"]!.dependenciesReady);
    assert.deepEqual(Object.keys(agent.snapshot().journeys), Object.keys(availability.snapshot().journeys));
    assert.equal((await f.admin.query("SELECT count(*) FROM desert_runs")).rows[0].count, "0");
    assert.equal((await storedObjects(f.admin, f.application)).length, 0);
    for (const options of [{ pollIntervalMs: 0 }, { validForMs: Infinity }, { pollIntervalMs: 300, validForMs: 300 }]) {
      assert.throws(() => f.session.watchAvailability(options), /INVALID_AVAILABILITY_TIMING/);
    }
  } finally { await f.close(); }
});
