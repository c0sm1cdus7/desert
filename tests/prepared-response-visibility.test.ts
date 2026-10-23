import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import { openLocalController } from "../src/local/controller.ts";
import { localWebGateway } from "../src/web/gateway.ts";
import { protocolNotebookDefinition } from "./fixtures/notebook.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

test("authenticated human prepare projects only declared facts, preserving the complete atomic effect and retry", async () => {
  const definition: ProductDefinition = protocolNotebookDefinition();
  definition.objects[0]!.facts.privateFact = { kind: "text" };
  const creation = definition.journeys!.find(item => item.id === "create-note")!;
  assert.ok(creation.kind === "mutation" && creation.command.kind === "create");
  creation.command.values.privateFact = { kind: "literal", value: "test-only-secret" };
  const application = compile(definition), database = await cluster.database();
  const host = await openLocalController(application, { ...database, roles: ["notes"] });
  const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
  const identity = await host.identities.issue("Prepare projection fixture");
  const gateway = localWebGateway(host.connect(identity.token, "human"), application.digest);
  let origin = "", cookie = "";
  const server = createServer((request, response) => { void gateway.handle(request, response, origin); });
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); assert.ok(address && typeof address !== "string");
    origin = `http://127.0.0.1:${address.port}`;
    const post = (operation: string, input: unknown) => fetch(`${origin}/api/${operation}`, {
      method: "POST", headers: { origin, cookie, "content-type": "application/json", "x-desert-contract": application.digest },
      body: JSON.stringify(input),
    });
    assert.equal((await post("begin", { journeyId: "read-note" })).status, 401);
    const connected = await post("connect", { invitation: gateway.invitation });
    assert.equal(connected.status, 200); cookie = connected.headers.get("set-cookie")!.split(";")[0]!;
    const rpc = async (operation: string, input: unknown) => {
      const response = await post(operation, input); assert.equal(response.status, 200);
      return await response.json();
    };
    let subject: string | undefined;
    for (const [journeyId, input, state] of [
      ["create-note", { title: "Public title", body: "Public body" }, "active"],
      ["archive-note", {}, "archived"],
    ] as const) {
      const run = await rpc("begin", { journeyId, ...(subject ? { subject } : {}) });
      const request = { runId: run.id, input };
      const initial = await rpc("prepare", request), repeated = await rpc("prepare", request);
      assert.deepEqual(initial, repeated, "retries preserve the same occurrence and projection");
      assert.deepEqual(initial.facts, { title: "Public title", body: "Public body", state });
      assert.ok(!JSON.stringify(initial).includes("test-only-secret"), "raw transport must not disclose unexposed facts");
      const stored = (await admin.query("SELECT effect, confirmation_digest FROM desert_intents WHERE id=$1", [initial.id])).rows[0];
      assert.equal(stored.effect.facts.privateFact, "test-only-secret", "projection must not erase stored facts");
      assert.equal(stored.effect.facts.owner, identity.id);
      assert.equal(initial.confirmationDigest, stored.confirmation_digest);
      assert.equal((await post("accept", { intentId: initial.id, confirmationDigest: "forged" })).status, 409);
      const receipt = await rpc("accept", { intentId: initial.id, confirmationDigest: initial.confirmationDigest });
      assert.deepEqual(await rpc("accept", { intentId: initial.id, confirmationDigest: initial.confirmationDigest }), receipt);
      assert.deepEqual(await rpc("receipt", { intentId: initial.id }), receipt);
      subject = receipt.object.id;
    }
    const persisted = (await admin.query("SELECT version,facts FROM desert_objects")).rows;
    assert.equal(persisted.length, 1); assert.equal(persisted[0].version, 2);
    assert.equal(persisted[0].facts.privateFact, "test-only-secret");
    assert.equal(persisted[0].facts.state, "archived");
    assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "2");
  } finally {
    gateway.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await admin.end(); await host.close();
  }
});
