import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { ApiMethods, HumanSurface, Prepared, Receipt } from "../src/web/types.ts";
import { humanState } from "../src/web/client/state.ts";
import { mutationFlow } from "../src/web/client/mutations.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import { transientFrame } from "../src/interaction/transient-frame.ts";
import { TransportError, type Transport } from "../src/web/client/transport.ts";
import { failureFeedback } from "../src/web/client/failure-feedback.ts";

function fixture(uncertain = true) {
  const surface = compile(Notebook).surface("human") as HumanSurface;
  const store = humanState(surface);
  const prepared: Prepared = { id: "original-intent", runId: "original-run", journeyId: "archive-note",
    object: { id: "original-note", type: "note", expectedVersion: 1 },
    facts: { title: "Keep this", body: "Same operation", state: "archived" }, confirmationDigest: "original-digest" };
  store.update({ view: uncertain ? "recovery" : "review", uncertain, prepared, mutationId: "archive-note",
    availability: { contractDigest: surface.contractDigest,
      journeys: { "archive-note": { dependenciesReady: true, blockers: [] } } } });
  const requests: { method: string, input: unknown }[] = [];
  let respond!: (value: Receipt | null) => void;
  let reject!: (error: Error) => void;
  const response = new Promise<Receipt | null>((resolve, fail) => { respond = resolve; reject = fail; });
  const transport: Transport = {
    connect: async () => {}, evidence: async () => ({ snapshot: store.get().availability, validForMs: 1000 }),
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]) {
      requests.push({ method, input });
      return await response as ApiMethods[K]["output"];
    },
  };
  let refreshes = 0;
  const flow = mutationFlow(surface, store, transport, () => true, async () => { refreshes++; });
  const frame = () => presentFrame(surface, store.get(), () => true);
  const receipt: Receipt = { id: prepared.id, runId: prepared.runId, commandId: "archive-note",
    status: "completed", object: { id: prepared.object.id, type: "note", version: 2 } };
  return { store, flow, frame, requests, respond, reject, prepared, receipt, refreshes: () => refreshes };
}

test("receipt checking marks only Check result pending and never sends acceptance", async () => {
  const f = fixture();
  const checking = f.flow.recover();
  try {
    await f.flow.accept();
    const frame = f.frame();
    assert.equal(frame.top.trailing?.find(action => action.intent.kind === "recover")?.state, "pending");
    assert.equal(frame.bottom.primary?.state, "unavailable");
    assert.equal(frame.bottom.secondary, undefined, "recovery leaves the host's dismissal slot free");
    const hosted = transientFrame(frame, true);
    assert.deepEqual(hosted.bottom.secondary?.intent, { kind: "close" });
    assert.deepEqual(hosted.top.leading, hosted.bottom.secondary);
    assert.deepEqual(f.requests, [{ method: "receipt", input: { intentId: f.prepared.id } }]);
  } finally { f.respond(null); await checking; }
});

test("a missing receipt is visible inside recovery without inventing a known failure", async () => {
  const f = fixture();
  const checking = f.flow.recover();
  f.respond(null);
  await checking;
  const frame = f.frame();
  assert.equal(frame.content.kind, "review");
  assert.match(frame.content.recovery ?? "", /No saved result.*found/i);
  assert.match(frame.content.recovery ?? "", /Check again.*retry this same confirmation/i);
  assert.doesNotMatch(frame.content.recovery ?? "", /failed|no change was accepted/i);
  assert.equal(f.store.get().view, "recovery");
  assert.equal(f.store.get().uncertain, true);
  assert.equal(f.store.get().prepared, f.prepared);
  assert.equal(f.store.get().notice, "", "the check result belongs to the active recovery surface");
  assert.equal(f.store.get().pendingAction, null);
  assert.equal(frame.top.trailing?.[0]?.state, "ready");
  assert.equal(frame.bottom.primary?.state, "ready");
});

test("retrying marks only Retry pending and reuses the original confirmation", async () => {
  const f = fixture();
  const retrying = f.flow.accept();
  try {
    const frame = f.frame();
    assert.equal(frame.bottom.primary?.state, "pending");
    assert.equal(frame.top.trailing?.find(action => action.intent.kind === "recover")?.state, "unavailable");
    assert.deepEqual(f.requests, [{ method: "accept", input: {
      intentId: f.prepared.id, confirmationDigest: f.prepared.confirmationDigest,
    } }]);
  } finally { f.respond(f.receipt); await retrying; }
  assert.equal(f.store.get().view, "detail");
  assert.equal(f.store.get().uncertain, false);
  assert.equal(f.refreshes(), 1);
});

test("a found receipt completes the original operation without acceptance", async () => {
  const f = fixture();
  const checking = f.flow.recover();
  f.respond(f.receipt);
  await checking;
  assert.equal(f.store.get().view, "detail");
  assert.equal(f.store.get().prepared, null);
  assert.equal(f.store.get().notice, "Saved");
  assert.deepEqual(f.requests.map(request => request.method), ["receipt"]);
  assert.equal(f.refreshes(), 1);
});

test("ordinary review retains Back and failed recovery retains uncertainty", async () => {
  const review = fixture(false).frame();
  assert.deepEqual(review.bottom.secondary?.intent, { kind: "back" });
  assert.equal(review.top.trailing, undefined);
  assert.deepEqual(transientFrame(review, false).top.leading?.intent, { kind: "back" });
  const f = fixture();
  const checking = f.flow.recover();
  f.reject(new TransportError("CONNECTION_LOST"));
  await checking;
  assert.equal(f.store.get().uncertain, true);
  assert.equal(f.store.get().busy, false);
  assert.equal(f.store.get().prepared, f.prepared);
});

test("lost acceptance becomes uncertain, and a retry rejection does not rewrite that history", async () => {
  for (const [uncertain, code] of [[false, "CONNECTION_LOST"], [true, "PRECONDITION_FAILED"]] as const) {
    const f = fixture(uncertain);
    const accepting = f.flow.accept();
    f.reject(new TransportError(code));
    await accepting;
    const state = f.store.get();
    assert.equal(state.view, "recovery");
    assert.equal(state.uncertain, true);
    assert.equal(state.prepared, f.prepared);
    assert.equal(state.pendingAction, null);
    assert.equal(failureFeedback(state.error, state.uncertain).title, "The result isn’t confirmed");
  }
});

test("recovery feedback does not enable unavailable operations", async () => {
  const f = fixture();
  f.store.update({ availability: { ...f.store.get().availability, journeys: {
    "archive-note": { dependenciesReady: false, blockers: [{ dependency: "notes", reason: "unreachable" }] },
  } } });
  await f.flow.recover();
  await f.flow.accept();
  assert.deepEqual(f.requests, []);
  assert.equal(f.frame().top.trailing?.[0]?.state, "unavailable");
  assert.equal(f.frame().bottom.primary?.state, "unavailable");
});

test("a mismatched receipt cannot clear the original uncertain operation", async () => {
  const f = fixture();
  const checking = f.flow.recover();
  f.respond({ ...f.receipt, id: "unrelated-intent" });
  await checking;
  assert.equal(f.store.get().error, "INVALID_RESPONSE");
  assert.equal(f.store.get().uncertain, true);
  assert.equal(f.store.get().prepared, f.prepared);
  assert.equal(f.store.get().pendingAction, null);
  assert.equal(f.refreshes(), 0);
});
