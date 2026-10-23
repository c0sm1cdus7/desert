import assert from "node:assert/strict";
import test from "node:test";
import { webTransport, type ControllerTransport } from "../src/web/client/transport.ts";
import { readRequest } from "../src/web/client/read-runs.ts";

test("superseding a browser read aborts its fetch and does not issue another operation", async t => {
  const controller = new AbortController(), requests: string[] = [];
  let requestSignal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    requests.push(url); requestSignal = init.signal as AbortSignal;
    return await new Promise<Response>((_, reject) => requestSignal!.addEventListener("abort", () => reject(requestSignal!.reason), { once: true }));
  });
  const result = readRequest(webTransport("contract", { kind: "developer" }), controller.signal, "read", { runId: "run" });
  controller.abort();
  await assert.rejects(result, error => error instanceof Error && error.name === "AbortError");
  assert.equal(requestSignal?.aborted, true);
  assert.deepEqual(requests, ["/api/read"]);
});

test("an aborted read abandons an uncooperative host and discards its later answer", async () => {
  const controller = new AbortController();
  let release!: (value: unknown) => void, calls = 0;
  const transport = { call: () => { calls++; return new Promise(resolve => { release = resolve; }); } } as unknown as ControllerTransport;
  const result = readRequest(transport, controller.signal, "offer", { journeyId: "edit", subject: "old" });
  controller.abort();
  await assert.rejects(result, error => error instanceof Error && error.name === "AbortError");
  release({ subject: "old", eligible: true }); await Promise.resolve();
  assert.equal(calls, 1);
});

test("a previously aborted generation cannot start a controller operation", async () => {
  const controller = new AbortController(); controller.abort();
  const transport = { call: () => { throw new Error("MUST_NOT_CALL"); } } as unknown as ControllerTransport;
  await assert.rejects(readRequest(transport, controller.signal, "begin", { journeyId: "read-note" }),
    error => error instanceof Error && error.name === "AbortError");
});
