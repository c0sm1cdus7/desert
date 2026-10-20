import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { Pool, type PoolClient } from "pg";
import { localDatabase } from "../src/local/database.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

test("a client fault between pool delivery and await resumption cannot escape or start an operation", async t => {
  const database = localDatabase(await cluster.database());
  await database.transaction(client => client.query("CREATE TABLE handoff_effects (value text)"));
  const connect = Pool.prototype.connect;
  const fault = Object.assign(new Error("Connection terminated at checkout boundary"), { code: "57P01" });
  let escaped: unknown;
  let delivered = false;
  let invoked = false;
  const faults: unknown[] = [];
  database.onFault(error => faults.push(error));
  // Exercise the driver's event ordering, not a simulated PostgreSQL implementation.
  const hook = t.mock.method(Pool.prototype, "connect", function (this: Pool) {
    return new Promise<PoolClient>((resolve, reject) => {
      connect.call(this, (error, client) => {
        if (error || !client) { reject(error ?? new Error("Missing connection")); return; }
        resolve(client);
        if (!delivered) {
          delivered = true;
          try { client.emit("error", fault); } catch (error) { escaped = error; }
        }
      });
    });
  });
  try {
    const result = await database.transaction(async client => {
      invoked = true;
      await client.query("INSERT INTO handoff_effects VALUES ('must not happen')");
    }).then(() => ({ error: undefined }), error => ({ error }));
    assert.equal(delivered, true);
    assert.equal(escaped, undefined, "An acquired client has an unguarded error-event window");
    assert.equal(result.error, fault);
    assert.equal(invoked, false);
    assert.deepEqual(faults, [fault]);
    hook.mock.restore();
    assert.equal((await database.transaction(client => client.query("SELECT count(*) FROM handoff_effects"))).rows[0].count, "0");
    await database.transaction(client => client.query("INSERT INTO handoff_effects VALUES ('explicit recovery')"));
  } finally { hook.mock.restore(); await database.close(); }
});

test("real backend termination between statements rolls back and permits explicit recovery", async () => {
  const options = await cluster.database();
  const database = localDatabase(options);
  const admin = new Pool({ host: options.socketDirectory, database: options.database, user: options.user });
  const observed = new Promise<unknown>(resolve => { database.onFault(resolve); });
  try {
    await database.transaction(client => client.query("CREATE TABLE terminated_effects (value text)"));
    const failure = await database.transaction(async client => {
      await client.query("INSERT INTO terminated_effects VALUES ('uncommitted')");
      const pid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      assert.equal((await admin.query("SELECT pg_terminate_backend($1) AS terminated", [pid])).rows[0].terminated, true);
      await observed;
    }).then(() => null, error => error);
    assert.ok(failure, "A dead transaction must not report success");
    assert.equal((await database.transaction(client => client.query("SELECT count(*) FROM terminated_effects"))).rows[0].count, "0");
    await database.transaction(client => client.query("INSERT INTO terminated_effects VALUES ('recovered')"));
    assert.equal((await database.transaction(client => client.query("SELECT count(*) FROM terminated_effects"))).rows[0].count, "1");
  } finally { await database.close(); await admin.end(); }
});
