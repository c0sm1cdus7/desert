import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { openLocalController } from "../src/local/controller.ts";
import { serveIdentitySurface } from "../src/web/server.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("a stale tab cannot use another identity's shared cookie for reads, activities, bytes, lock or execution", async () => {
  const cluster = postgresCluster(), application = compile(Notebook);
  const controller = await openLocalController(application, { ...await cluster.database(), roles: ["notes"] });
  const server = await serveIdentitySurface(controller, "human", (_request, response) => response.end("fixture"), 0);
  const a = { login: "identity-a", password: "disposable password for identity A" };
  const b = { login: "identity-b", password: "disposable password for identity B" };
  const admin = await controller.access.initialize({ ...a, displayName: "A" });
  await controller.access.createIdentity(admin.token, { ...b, displayName: "B" });
  async function request(operation: string, input: unknown | undefined, cookie = "", binding?: string) {
    return fetch(`${server.origin}/api/${operation}`, { method: input === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Origin: server.origin, Cookie: cookie,
        "X-Desert-Contract": application.digest, ...(binding ? { "X-Desert-Session": binding } : {}) },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  }
  async function signIn(input: typeof a) {
    const response = await request("signIn", input);
    assert.equal(response.status, 200);
    return { state: await response.json(), cookie: response.headers.getSetCookie()[0]!.split(";")[0]! };
  }
  try {
    const first = await signIn(a), second = await signIn(b);
    for (const [operation, input] of [
      ["begin", { journeyId: "create-note" }], ["availability", undefined],
      ["activityList", {}], ["private-images/00000000-0000-4000-8000-000000000000?runId=unknown&variant=320", undefined],
      ["prepare", { runId: "old-a-run", input: { title: "A draft", body: "Private A" } }],
      ["accept", { intentId: "old-a-intent", confirmationDigest: "old-a-confirmation" }], ["lock", {}],
    ] as const) {
      for (const binding of [undefined, first.state.sessionBinding ?? "a".repeat(43)]) {
        const response = await request(operation, input, second.cookie, binding);
        assert.equal(response.status, 401, `${operation} must reject an unbound or stale instance before dispatch`);
        assert.match((await response.json()).error, /^BROWSER_SESSION_(BINDING_REQUIRED|CHANGED)$/);
      }
    }
    assert.equal((await controller.access.state(admin.token)).kind, "ready");
    const current = await request("accessState", undefined, second.cookie);
    assert.equal((await current.json()).kind, "ready", "a stale lock cannot revoke the new session");
    const begun = await request("begin", { journeyId: "read-note" }, second.cookie, second.state.sessionBinding);
    assert.equal(begun.status, 200);
    assert.equal(begun.headers.get("X-Desert-Session"), second.state.sessionBinding);
    const run = await begun.json();
    const read = await request("read", { runId: run.id }, second.cookie, second.state.sessionBinding);
    assert.deepEqual(await read.json(), []);
    assert.notEqual(first.state.sessionBinding, second.state.sessionBinding);
    assert.match(first.state.sessionBinding, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(first.cookie.includes(first.state.sessionBinding), false, "the public binding is not an authentication credential");
  } finally { await server.close(); await controller.close(); cluster.dispose(); }
});
