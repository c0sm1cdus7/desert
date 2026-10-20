import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { humanState, type HumanState } from "../src/web/client/state.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import type { HumanSurface } from "../src/web/types.ts";

const surface = compile(Notebook).surface("human") as HumanSurface;
function reviewState(): HumanState {
  return { ...humanState(surface).get(), view: "review", mutationId: "archive-note",
    detail: { id: "note-a", version: 3, facts: { title: "Field notes", body: "Long unchanged prose.", state: "active" } },
    prepared: { id: "intent-a", runId: "run-a", journeyId: "archive-note", confirmationDigest: "digest-a",
      object: { id: "note-a", type: "note", expectedVersion: 3 },
      facts: { title: "Field notes", body: "Long unchanged prose.", state: "archived", privateFact: "Secret" } } };
}

test("review leads with changes from the exact known object revision, without granting more visibility", () => {
  const frame = presentFrame(surface, reviewState(), () => true);
  assert.equal(frame.top.subtitle, "Status: active → archived");
  assert.equal(frame.content.kind, "review");
  if (frame.content.kind !== "review") throw new Error("REVIEW_REQUIRED");
  assert.deepEqual(frame.content.details.fields, ["state", "title", "body"]);
  assert.equal(Object.hasOwn(frame.content.details.facts, "privateFact"), false);
  assert.equal(frame.content.details.facts.body, "Long unchanged prose.");
});

test("review does not invent a before value for an unknown field, different object or stale revision", () => {
  for (const mismatch of ["unknown", "object", "revision"] as const) {
    const state = reviewState();
    state.detail = { ...state.detail!, ...(mismatch === "object" ? { id: "note-b" } : {}),
      ...(mismatch === "revision" ? { version: 2 } : {}),
      facts: mismatch === "unknown" ? { title: "Field notes", body: "Long unchanged prose." } : state.detail!.facts };
    const frame = presentFrame(surface, state, () => true);
    assert.equal(frame.top.subtitle, "Review the resulting record before confirming.", mismatch);
    assert.equal(frame.content.kind, "review");
    if (frame.content.kind !== "review") throw new Error("REVIEW_REQUIRED");
    assert.deepEqual(frame.content.details.fields, ["title", "body", "state"]);
  }
});

test("change summaries keep zero and empty distinct and bound prose without shortening the reviewed facts", () => {
  const state = reviewState();
  state.detail = { ...state.detail!, facts: { ...state.detail!.facts, state: 0 } };
  state.prepared = { ...state.prepared!, facts: { ...state.prepared!.facts, state: "" } };
  assert.equal(presentFrame(surface, state, () => true).top.subtitle, "Status: 0 → Empty");
  const prose = "A long replacement value. ".repeat(20);
  state.prepared = { ...state.prepared!, facts: { ...state.prepared!.facts, state: prose } };
  const frame = presentFrame(surface, state, () => true);
  assert.equal(frame.top.subtitle, "1 field will change. Review the updated value first.");
  if (frame.content.kind !== "review") throw new Error("REVIEW_REQUIRED");
  assert.equal(frame.content.details.facts.state, prose);
});
