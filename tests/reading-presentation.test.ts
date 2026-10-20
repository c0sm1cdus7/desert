import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { humanState } from "../src/web/client/state.ts";
import { presentFrame } from "../src/web/client/frame.ts";
import { surfaceFrame } from "../src/interaction/surface-frame.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { presentFact, presentTitle } from "../src/interaction/fact-presentation.ts";

test("context derives multiline reading from the declared field need and does not repeat its title", () => {
  const surface = compile(Notebook).surface("human") as HumanSurface;
  const state = { ...humanState(surface).get(), view: "detail" as const,
    detail: { id: "a", version: 1, facts: { title: "A full title", body: "First paragraph.\n\nSecond paragraph.", state: "active" } } };
  const frame = presentFrame(surface, state, () => true);
  assert.equal(frame.top.title, "A full title");
  assert.equal(frame.content.kind, "context");
  if (frame.content.kind !== "context") throw new Error("CONTEXT_REQUIRED");
  assert.deepEqual(frame.content.details.fields, ["body", "state"]);
  assert.deepEqual(Reflect.get(frame.content.details, "multiline"), ["body"]);
  assert.equal(frame.content.details.facts.body, state.detail.facts.body);
  assert.deepEqual(frame.bottom, {}, "reading does not require a command footer");
});

test("presentation names blank and unknown values without changing valid facts", () => {
  assert.equal(presentTitle("  \n "), "Untitled");
  assert.equal(presentTitle(undefined), "Unknown");
  assert.equal(presentTitle(0), "0");
  assert.equal(presentTitle(" A title "), " A title ");
  assert.equal(presentFact(undefined), "Unknown");
  assert.equal(presentFact(" \n "), "Empty");
  assert.equal(presentFact(0), "0");
  assert.equal(presentFact(" First\n\nSecond "), " First\n\nSecond ");
});

test("fact presentation rejects references outside its exposed fields", () => {
  const frame = { version: "desert.surface-frame/6", kind: "context", top: { title: "Record" }, bottom: {},
    content: { kind: "facts", object: "entry", fields: ["text"], facts: { text: "Content" }, labels: { "entry.text": "Text" }, multiline: ["text"] } };
  assert.doesNotThrow(() => surfaceFrame(frame));
  for (const multiline of [["private"], ["text", "text"]]) {
    assert.throws(() => surfaceFrame({ ...frame, content: { ...frame.content, multiline } }), /INVALID_SURFACE_FRAME/);
  }
});
