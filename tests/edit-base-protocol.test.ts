import assert from "node:assert/strict";
import test from "node:test";
import { dispatch } from "../src/web/dispatch.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { compile } from "../src/compile.ts";
import type { LocalSession } from "../src/local.ts";
import { EditingNotebook } from "./fixtures/editing-notebook.ts";

test("the web protocol carries edit base separately from canonical business input", async () => {
  const calls: unknown[][] = [];
  const session = { prepare: async (...args: unknown[]) => { calls.push(args); return "prepared"; } } as unknown as LocalSession;
  const input = { title: "Edit", body: "Body" };
  assert.equal(await dispatch(session, "prepare", { runId: "run", input, options: { expectedVersion: 3 } }), "prepared");
  assert.deepEqual(calls, [["run", input, { expectedVersion: 3 }]]);
  for (const options of [null, {}, { expectedVersion: 0 }, { expectedVersion: -1 }, { expectedVersion: 1.2 },
    { expectedVersion: "3" }, { expectedVersion: Number.MAX_SAFE_INTEGER + 1 }, { expectedVersion: 3, extra: true }]) {
    assert.throws(() => dispatch(session, "prepare", { runId: "run", input, options }), /INVALID_REQUEST/);
  }
  assert.equal(calls.length, 1, "Malformed transport metadata must never reach the session");
});

test("the web builder refuses detached execution contracts without an admitted View composition", async () => {
  await assert.rejects(buildHumanModule(compile(EditingNotebook), "human"), /COMPOSED_PRODUCT_REQUIRED/);
});
