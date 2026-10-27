import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { localWebGateway } from "../src/web/gateway.ts";
import type { ApiMethods } from "../src/web/types.ts";
import { activityFixture } from "./fixtures/activity.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { storedObjects } from "../src/testing/stored-objects.ts";

test("authenticated HTTP collects, resumes, prepares and accepts the same canonical activity", async () => {
  const cluster = postgresCluster(), f = await activityFixture(cluster);
  const gateway = localWebGateway(f.session, f.application.digest);
  let origin = "", cookie = "";
  const server = createServer((request, response) => { void gateway.handle(request, response, origin); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_HOST_FAILED");
  origin = `http://127.0.0.1:${address.port}`;
  async function request(method: string, input: unknown) {
    return fetch(`${origin}/api/${method}`, { method: "POST", headers: {
      "Content-Type": "application/json", "X-Desert-Contract": f.application.digest, Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    }, body: JSON.stringify(input) });
  }
  async function call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
    const response = await request(method, input), value = await response.json();
    assert.equal(response.status, 200, JSON.stringify(value));
    return value;
  }
  try {
    const occurrence = randomUUID();
    assert.equal((await request("activityCreate", { occurrence, plan: f.plan })).status, 401);
    const connected = await request("connect", { invitation: gateway.invitation });
    assert.equal(connected.status, 200);
    cookie = connected.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await call("preflight", { journeyId: f.plan.journey, input: {} })).status, "incomplete");
    let state = await call("activityCreate", { occurrence, plan: f.plan });
    state = await call("activityAnswer", { id: state.id, revision: state.revision, step: 0, input: { title: "Detailed" } });
    assert.equal(state.progress.nextStep, 1);
    assert.deepEqual(await call("activityCreate", { occurrence, plan: f.plan }), state);
    assert.deepEqual((await call("activityList", {})).items.map(item => item.id), [state.id]);
    assert.deepEqual(await call("activityRead", { id: state.id }), state);
    state = await call("activityAnswer", { id: state.id, revision: state.revision, step: 1, input: { body: "Over HTTP" } });
    const stale = await call("activityPrepare", { id: state.id, revision: state.revision });
    state = await call("activityReopen", { id: state.id, revision: state.revision, step: 1 });
    assert.deepEqual(state.currentInput, { body: "Over HTTP" });
    const rejected = await request("accept", { intentId: stale.intent.id, confirmationDigest: stale.intent.confirmationDigest });
    assert.notEqual(rejected.status, 200);
    assert.equal((await rejected.json()).error, "ACTIVITY_PREPARATION_INVALIDATED");
    state = await call("activityAnswer", { id: state.id, revision: state.revision, step: 1, input: { body: "Over HTTP" } });
    const prepared = await call("activityPrepare", { id: state.id, revision: state.revision });
    assert.equal((await storedObjects(f.admin, f.application)).length, 0);
    const receipt = await call("accept", { intentId: prepared.intent.id, confirmationDigest: prepared.intent.confirmationDigest });
    assert.equal(receipt.status, "completed");
    assert.equal((await call("activityRead", { id: state.id })).phase, "completed");
    assert.equal((await storedObjects(f.admin, f.application))[0]!.facts.body, "Over HTTP");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    gateway.close();
    await f.close();
    cluster.dispose();
  }
});
