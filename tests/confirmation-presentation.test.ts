import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { reviewFrame } from "../src/interaction/frame-presenters.ts";
import type { HumanSurface } from "../src/web/types.ts";

test("confirmation is compact and retains explicit acceptance and recovery", () => {
  const base = compile(Notebook).surface("human") as HumanSurface;
  const mutation = base.journeys.find(item => item.id === "archive-note")!;
  assert.equal(mutation.kind, "mutation");
  const surface = { ...base, commit: { ...base.commit, [mutation.id]: "confirm" as const } };
  const frame = reviewFrame(surface, mutation, { title: "Selected note", body: "Private body", state: "archived" },
    { kind: "review" }, false, true);
  assert.equal(frame.kind, "confirmation");
  assert.equal(frame.content.kind, "message");
  assert.equal(frame.bottom.secondary?.label, "Cancel");
  assert.equal(frame.bottom.primary?.intent.kind, "accept");
  assert.equal(JSON.stringify(frame).includes("Private body"), false);
  const recovery = reviewFrame(surface, mutation, { title: "Selected note", body: "Private body", state: "archived" },
    { kind: "recovery", method: "same-confirmation" }, false, true);
  assert.equal(recovery.kind, "journey");
  assert.equal(recovery.top.title, "Check result");
});
