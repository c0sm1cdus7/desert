import assert from "node:assert/strict";
import test from "node:test";
import { readRuns } from "../src/web/client/read-runs.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";

function fixture() {
  let release!: (value: { id: string }) => void;
  const calls: { method: string; run: string | undefined }[] = [];
  const transport = { async call(method: string, input: { runId?: string }) {
    calls.push({ method, run: input.runId });
    if (method === "begin") {
      if (calls.length === 1) return new Promise<{ id: string }>(resolve => { release = resolve; });
      return { id: "new-run" };
    }
    return [];
  } } as unknown as ControllerTransport;
  return { runs: readRuns(transport, "read-note"), calls, release: () => release({ id: "old-run" }) };
}

test("clearing admissions rejects a late begin before it reads or repopulates the cache", async () => {
  const f = fixture(), old = f.runs.read();
  f.runs.clear(); f.release();
  await assert.rejects(old, /READ_CANCELLED/);
  await f.runs.read(); await f.runs.read();
  assert.deepEqual(f.calls, [{ method: "begin", run: undefined }, { method: "begin", run: undefined },
    { method: "read", run: "new-run" }, { method: "read", run: "new-run" }]);
});

test("an old admission cannot replace a newer collection run after clear", async () => {
  const f = fixture(), old = f.runs.read();
  f.runs.clear(); await f.runs.read(); f.release();
  await assert.rejects(old, /READ_CANCELLED/);
  await f.runs.read();
  assert.equal(f.calls.filter(call => call.method === "begin").length, 2);
  assert.equal(f.calls.at(-1)?.run, "new-run");
});
