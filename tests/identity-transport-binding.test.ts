import test from "node:test";
import assert from "node:assert/strict";
import { webTransport, type WebSessionBinding } from "../src/web/client/transport.ts";

const nonce = "a".repeat(43), other = "b".repeat(43);
const asset = { kind: "asset", reference: "e7000000-0000-4000-8000-000000000001" } as const;
function binding() {
  let current = true;
  const value: WebSessionBinding = { kind: "identity", sessionBinding: nonce,
    isCurrent: () => current, invalidate() { current = false; } };
  return { value, invalidate: () => { current = false; }, current: () => current };
}
test("unbound browser transports fail before sending; developer access must be explicit", async t => {
  let sent = 0;
  t.mock.method(globalThis, "fetch", async () => { sent++; return Response.json({}); });
  await assert.rejects(webTransport("contract").call("begin", { journeyId: "create-note" }), /BROWSER_SESSION_BINDING_REQUIRED/);
  assert.equal(sent, 0);
  await webTransport("contract", { kind: "developer" }).call("begin", { journeyId: "create-note" });
  assert.equal(sent, 1);
});
test("every JSON, availability and byte request carries the fixed binding; another binding is rejected before body parsing", async t => {
  for (const operation of ["begin", "availability", "image", "upload"] as const) {
    const state = binding(), transport = webTransport("contract", state.value);
    let parsed = 0, calls = 0;
    t.mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
      calls++; assert.equal(new Headers(init?.headers).get("X-Desert-Session"), nonce);
      if (operation === "upload" && calls === 1) return Response.json(asset, { headers: { "X-Desert-Session": nonce } });
      const response = Response.json({ secret: "other identity" }, { headers: { "X-Desert-Session": other } });
      response.json = async () => { parsed++; return { secret: "other identity" }; };
      response.blob = async () => { parsed++; return new Blob(["other identity"]); };
      return response;
    });
    const run = operation === "begin" ? transport.call("begin", { journeyId: "create-note" })
      : operation === "availability" ? transport.evidence()
      : operation === "image" ? transport.image({ runId: "read", reference: asset.reference, variant: 320 })
      : transport.stageImage({ runId: "create", inputField: "image", file: new Blob(["image"]) });
    await assert.rejects(run, /BROWSER_SESSION_CHANGED/);
    assert.equal(parsed, 0); assert.equal(state.current(), false);
    assert.equal(calls, operation === "upload" ? 2 : 1, "a changed session never reconciles or replays an upload");
    t.mock.restoreAll();
  }
});
test("a matching response arriving after instance invalidation is discarded without parsing or replay", async t => {
  const state = binding(), transport = webTransport("contract", state.value);
  let release!: (response: Response) => void, parsed = 0, calls = 0;
  t.mock.method(globalThis, "fetch", () => { calls++; return new Promise<Response>(resolve => { release = resolve; }); });
  const result = transport.call("prepare", { runId: "run-a", input: { title: "A private draft" } });
  state.invalidate();
  const response = Response.json({}, { headers: { "X-Desert-Session": nonce } });
  response.json = async () => { parsed++; return {}; };
  release(response);
  await assert.rejects(result, /BROWSER_SESSION_CHANGED/); assert.equal(parsed, 0); assert.equal(calls, 1);
});
test("generation changes during body consumption also prevent returning old JSON or image bytes", async t => {
  for (const bytes of [false, true]) {
    const state = binding(), transport = webTransport("contract", state.value);
    t.mock.method(globalThis, "fetch", async () => {
      const response = Response.json({}, { headers: { "X-Desert-Session": nonce } });
      response.json = async () => { state.invalidate(); return {}; };
      response.blob = async () => { state.invalidate(); return new Blob(["old bytes"], { type: "image/webp" }); };
      return response;
    });
    await assert.rejects(bytes ? transport.image({ runId: "run-a", reference: asset.reference, variant: 320 })
      : transport.call("read", { runId: "run-a" }), /BROWSER_SESSION_CHANGED/);
    t.mock.restoreAll();
  }
});

test("an unavailable access check cannot authenticate a response or destroy the still-bound draft instance", async t => {
  const state = binding(), transport = webTransport("contract", state.value);
  let parsed = false;
  t.mock.method(globalThis, "fetch", async () => {
    const response = Response.json({ error: "CONTROLLER_UNAVAILABLE" }, { status: 503 });
    response.json = async () => { parsed = true; return {}; };
    return response;
  });
  await assert.rejects(transport.call("read", { runId: "private-read" }), /CONTROLLER_UNAVAILABLE/);
  assert.equal(state.current(), true); assert.equal(parsed, false);
});

test("an explicit unauthenticated reply invalidates the instance even when its session header matches", async t => {
  const state = binding();
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "UNAUTHENTICATED" },
    { status: 401, headers: { "X-Desert-Session": nonce } }));
  await assert.rejects(webTransport("contract", state.value).call("read", { runId: "expired" }), /BROWSER_SESSION_CHANGED/);
  assert.equal(state.current(), false);
});
