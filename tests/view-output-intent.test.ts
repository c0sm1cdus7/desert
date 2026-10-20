import test from "node:test";
import assert from "node:assert/strict";
import { surfaceIntent, dispatchSurfaceIntent, intentKey } from "../src/interaction/intent.ts";

test("View output and navigation intents are typed local presentation operations", () => {
  const output = { kind: "view.output", view: "home", output: "create" };
  assert.deepEqual(surfaceIntent(output), output);
  assert.deepEqual(surfaceIntent({ kind: "navigation.toggle" }), { kind: "navigation.toggle" });
  assert.throws(() => surfaceIntent({ ...output, style: "padding:0" }), /INVALID_SURFACE_INTENT/);
  assert.notEqual(intentKey(surfaceIntent(output)), intentKey(surfaceIntent({ ...output, view: "notes" })));
});

test("local presentation intents cannot reach product execution handlers", () => {
  let invoked = false;
  const handlers = { journey: () => { invoked = true; }, back() {}, close() {}, accept() {}, recover() {} };
  for (const input of [
    { kind: "view.output", view: "home", output: "create" },
    { kind: "navigation.toggle" },
  ]) {
    const intent = surfaceIntent(input);
    assert.throws(() => dispatchSurfaceIntent(intent, handlers), /INVALID_SURFACE_INTENT_SCOPE/);
  }
  assert.equal(invoked, false);
});
