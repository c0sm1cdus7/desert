import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { identityWebGateway } from "../src/identity/gateway.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());
test("HTTP onboarding needs launch capability; lock invalidates every controller operation and permits password sign-in", async () => {
  const application = compile(Notebook), database = await cluster.database();
  const controller = await openLocalController(application, { ...database, roles: ["notes"] });
  const gateway = identityWebGateway(controller.access, token => controller.connect(token, "human"), application.digest);
  let origin = "";
  const server = createServer((request, response) => { void gateway.handle(request, response, origin); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const sessionBindings = new Map<string, string>();
  const request = async (operation: string, input?: unknown, cookie = "", requestOrigin = origin) => fetch(`${origin}/api/${operation}`, {
    method: input === undefined ? "GET" : "POST", headers: { "content-type": "application/json", origin: requestOrigin,
      "x-desert-contract": application.digest, cookie,
      ...(sessionBindings.has(cookie) ? { "x-desert-session": sessionBindings.get(cookie)! } : {}) },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  const fields = { login: "franco", displayName: "Franco", password: "a real private password" };
  try {
    assert.deepEqual(await (await request("accessState")).json(), { kind: "onboarding" });
    assert.equal((await request("initialize", fields)).status, 401);
    assert.equal((await request("connect", { invitation: gateway.invitation }, "", "http://attacker.test")).status, 403);
    const launch = await request("connect", { invitation: gateway.invitation });
    const bootstrap = launch.headers.getSetCookie()[0]!.split(";")[0]!;
    assert.match(bootstrap, /^desert-bootstrap=/);
    const initialized = await request("initialize", fields, bootstrap);
    assert.equal(initialized.status, 200);
    const body = await initialized.json();
    assert.equal(body.kind, "ready"); assert.equal("token" in body, false);
    const cookie = initialized.headers.getSetCookie().find(value => value.startsWith("desert-identity="))!.split(";")[0]!;
    assert.equal(typeof body.sessionBinding, "string");
    sessionBindings.set(cookie, body.sessionBinding);
    assert.match(initialized.headers.getSetCookie().join(";"), /HttpOnly/);
    assert.equal((await request("createIdentity", { login: "member", displayName: "Member", password: "another private password" }, cookie)).status, 409,
      "post-login administration is not exposed outside canonical command journeys");
    assert.equal((await request("initialize", fields, bootstrap)).status, 401);
    const begun = await request("begin", { journeyId: "create-note" }, cookie);
    assert.equal(begun.status, 200);
    const run = await begun.json();
    assert.equal((await request("lock", {}, cookie)).status, 200);
    assert.equal((await request("prepare", { runId: run.id, input: { title: "After lock", body: "Must not execute" } }, cookie)).status, 401);
    assert.deepEqual(await (await request("accessState", undefined, cookie)).json(), { kind: "locked" });
    const signin = await request("signIn", { login: fields.login, password: fields.password });
    assert.equal(signin.status, 200);
    const renewed = signin.headers.getSetCookie()[0]!.split(";")[0]!;
    const renewedAccess = await signin.json();
    assert.equal(typeof renewedAccess.sessionBinding, "string");
    sessionBindings.set(renewed, renewedAccess.sessionBinding);
    assert.notEqual(renewed, cookie);
    assert.notEqual(renewedAccess.sessionBinding, body.sessionBinding);
    assert.equal((await request("begin", { journeyId: "read-note" }, renewed)).status, 200);
    assert.equal((await request("signIn", { login: fields.login, password: fields.password, role: "administrator" })).status, 409);
  } finally {
    gateway.close(); server.closeIdleConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await controller.close();
  }
});
