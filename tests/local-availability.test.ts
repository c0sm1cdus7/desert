import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function fixture() {
  const database = await cluster.database();
  const host = await openLocalController(compile(Notebook), { ...database, roles: ["notes"] });
  const owner = await host.identities.issue("Owner");
  return { database, host, owner, session: host.connect(owner.token, "human") };
}

async function eventually(condition: () => boolean) {
  for (let attempt = 0; attempt < 500; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("Actual runtime did not reach the expected availability within five seconds");
}

test("Notebook observes a real PostgreSQL outage and recovery without replaying a prepared command", async () => {
  const f = await fixture();
  try {
    assert.equal(typeof f.session.watchAvailability, "function", "The session must observe its installed runtime");
    const availability = f.session.watchAvailability({ pollIntervalMs: 30, validForMs: 300 });
    const states: boolean[] = [];
    availability.subscribe(value => states.push(value.journeys["create-note"]!.dependenciesReady));
    const allReady = () => Object.values(availability.snapshot().journeys).every(value => value.dependenciesReady);
    await eventually(allReady);
    const create = await f.session.prepare((await f.session.begin("create-note")).id, { title: "Offline", body: "Real storage" });
    const receipt = await f.session.accept(create.id, create.confirmationDigest);
    const archive = await f.session.prepare((await f.session.begin("archive-note", receipt.object.id)).id, {});
    cluster.stop();
    await eventually(() => Object.values(availability.snapshot().journeys).every(value =>
      !value.dependenciesReady && value.blockers[0]?.reason === "unreachable"));
    await assert.rejects(f.session.begin("read-note"));
    cluster.start();
    await eventually(allReady);
    assert.deepEqual(await f.session.receipt(create.id), receipt);
    assert.equal(await f.session.receipt(archive.id), null);
    const records = await f.session.read((await f.session.begin("read-note", receipt.object.id)).id);
    assert.equal(records[0]!.facts.state, "active");
    assert.ok(states.includes(false) && states.includes(true));
    await f.session.accept(archive.id, archive.confirmationDigest);
    assert.equal((await f.session.read((await f.session.begin("read-note", receipt.object.id)).id))[0]!.facts.state, "archived");
  } finally { cluster.start(); await f.host.close(); }
});

test("revoked sessions remain blocked after database recovery; another valid session recovers", async () => {
  const f = await fixture();
  try {
    const availability = f.session.watchAvailability({ pollIntervalMs: 30, validForMs: 300 });
    await eventually(() => availability.snapshot().journeys["read-note"]!.dependenciesReady);
    const run = await f.session.begin("create-note");
    const intent = await f.session.prepare(run.id, { title: "Not accepted", body: "Revoked" });
    await f.host.identities.revoke(f.owner.id);
    const blocked = () => availability.snapshot().journeys["read-note"]!.blockers[0]?.reason === "session-required";
    await eventually(blocked);
    cluster.stop();
    await eventually(() => availability.snapshot().journeys["read-note"]!.blockers[0]?.reason === "unreachable");
    cluster.start();
    await eventually(blocked);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /UNAUTHENTICATED/);
    const other = await f.host.identities.issue("Other owner");
    const otherSession = f.host.connect(other.token, "human");
    const otherAvailability = otherSession.watchAvailability({ pollIntervalMs: 30, validForMs: 300 });
    await eventually(() => otherAvailability.snapshot().journeys["create-note"]!.dependenciesReady);
    assert.equal(blocked(), true);
    assert.deepEqual(await otherSession.read((await otherSession.begin("read-note")).id), []);
  } finally { await f.host.close(); }
});
