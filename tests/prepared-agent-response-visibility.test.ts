import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { localWebGateway } from "../src/web/gateway.ts";
import type { ApiMethods } from "../src/web/types.ts";
import { agentProjectionDefinition, initialFacts } from "./fixtures/agent-prepared-projection.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

const cases = [
  { journey: "create-note", input: { title: "Public title", body: "Supplied body" }, version: 1,
    expected: { title: "Public title", body: "Supplied body", state: "active" } },
  { journey: "archive-note", input: {}, version: 2,
    expected: { title: "Public title", state: "archived" } },
  { journey: "edit-alias", input: { aliasSource: "Supplied alias" }, version: 2,
    expected: { title: "Public title", state: "active", aliasTarget: "Supplied alias" } },
] as const;

for (const scenario of cases) {
  test(`authenticated agent ${scenario.journey} response is projected without changing its durable effect or receipt`, async () => {
    const application = compile(agentProjectionDefinition()), database = await cluster.database();
    const host = await openLocalController(application, { ...database, roles: ["notes"] });
    const admin = new Pool({ host: database.socketDirectory, user: database.user, database: database.database });
    const identity = await host.identities.issue("Agent projection fixture");
    const gateway = localWebGateway(host.connect(identity.token, "agent"), application.digest);
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
      assert.equal((await post("begin", { journeyId: scenario.journey })).status, 401);
      const connected = await post("connect", { invitation: gateway.invitation });
      assert.equal(connected.status, 200); cookie = connected.headers.get("set-cookie")!.split(";")[0]!;
      const rpc = async <K extends keyof ApiMethods>(operation: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> => {
        const response = await post(operation, input); assert.equal(response.status, 200);
        return await response.json();
      };
      assert.equal((await post("begin", { journeyId: "read-other-surface" })).status, 409);
      let subject: string | undefined;
      if (scenario.journey !== "create-note") {
        const seedRun = await rpc("begin", { journeyId: "create-note" });
        const seed = await rpc("prepare", { runId: seedRun.id, input: { title: "Public title", body: "Supplied body" } });
        subject = (await rpc("accept", { intentId: seed.id, confirmationDigest: seed.confirmationDigest })).object.id;
      }
      const run = await rpc("begin", { journeyId: scenario.journey, ...(subject ? { subject } : {}) });
      const request = { runId: run.id, input: scenario.input,
        ...(scenario.journey === "edit-alias" ? { options: { expectedVersion: 1 } } : {}) };
      const initial = await rpc("prepare", request), repeated = await rpc("prepare", request);
      assert.deepEqual(initial, repeated, "initial/retried HTTP responses must use the same occurrence and projection");
      assert.deepEqual(initial.facts, scenario.expected);
      assert.ok(!JSON.stringify(initial).includes("test-only-secret"), "raw agent HTTP must not disclose internal facts");
      assert.ok(!Object.hasOwn(initial.facts, "owner"));
      const stored = (await admin.query(`SELECT i.effect, i.input, i.confirmation_digest,
        r.actor, r.surface, r.journey, r.contract_digest FROM desert_intents i
        JOIN desert_runs r ON r.id=i.run_id WHERE i.id=$1`, [initial.id])).rows[0];
      const expectedFacts = { ...initialFacts, owner: identity.id,
        ...(scenario.journey === "archive-note" ? { state: "archived" } : {}),
        ...(scenario.journey === "edit-alias" ? { aliasTarget: "Supplied alias" } : {}) };
      assert.deepEqual(stored.effect.facts, expectedFacts, "projection must not erase or rewrite complete stored facts");
      assert.deepEqual(stored.input, scenario.input);
      assert.equal(stored.surface, "agent");
      const digestSource = { runId: run.id, actor: identity.id, surface: "agent", journey: scenario.journey,
        contractDigest: application.digest, input: scenario.input, effect: stored.effect };
      const digest = createHash("sha256").update(JSON.stringify(digestSource, (_key, value) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value)).digest("hex");
      assert.equal(initial.confirmationDigest, digest, "confirmation still covers the original complete effect");
      assert.equal(initial.confirmationDigest, stored.confirmation_digest);
      assert.equal((await post("accept", { intentId: initial.id, confirmationDigest: "forged" })).status, 409);
      const receipt = await rpc("accept", { intentId: initial.id, confirmationDigest: initial.confirmationDigest });
      assert.deepEqual(await rpc("accept", { intentId: initial.id, confirmationDigest: initial.confirmationDigest }), receipt);
      assert.deepEqual(await rpc("receipt", { intentId: initial.id }), receipt);
      assert.deepEqual(await rpc("prepare", request), initial, "repeated preparation after acceptance cannot widen response facts");
      const persisted = (await admin.query("SELECT version,facts FROM desert_objects")).rows;
      assert.equal(persisted.length, 1); assert.equal(persisted[0].version, scenario.version);
      assert.deepEqual(persisted[0].facts, expectedFacts);
      assert.equal(receipt.object.version, scenario.version);
      assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, String(scenario.version));
    } finally {
      gateway.close();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await admin.end(); await host.close();
    }
  });
}
