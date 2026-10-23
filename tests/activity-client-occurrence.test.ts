import test from "node:test";
import assert from "node:assert/strict";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { TransportError, type ControllerTransport } from "../src/web/client/transport.ts";
import { dispatch } from "../src/web/dispatch.ts";
import type { ActivitySnapshot } from "../src/web/client/activity-state.ts";

for (const interruption of ["before-controller", "after-controller"] as const) {
  test(`occurrence-only recovery after ${interruption} creation loss cannot adopt another saved draft`, async t => {
    const f = await activityClientFixture(t);
    const calls: { method: string; input: unknown }[] = [];
    let loseCreation = true, original: ActivitySnapshot | undefined;
    const transport: ControllerTransport = {
      async evidence() { throw new Error("Unused"); },
      async call(method, input) {
        calls.push({ method, input: structuredClone(input) });
        if (method === "activityCreate" && loseCreation) {
          loseCreation = false;
          if (interruption === "after-controller") {
            const creation = input as { occurrence: string; plan: typeof f.experience.activity };
            original = await f.session.activityCreate(creation.occurrence, creation.plan);
          }
          throw new TransportError("CONNECTION_LOST");
        }
        return dispatch(f.session, method, input);
      },
    };
    const first = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
    t.after(() => first.dispose());
    await first.open(f.experience);
    assert.equal(first.snapshot().error, "CONNECTION_LOST");
    assert.equal(first.snapshot().activity, null);
    const saved = structuredClone(f.journalEntry());
    assert.ok(saved); assert.equal(saved.activity, undefined); assert.equal(saved.pending, undefined);
    assert.equal(f.occurrenceCount(), 1);
    first.dispose();

    if (original) original = await f.session.activityAnswer(original.id, original.revision, 0, { title: "Exact occurrence answer" });
    const unrelated = await f.seed("Another saved draft");
    const firstRecoveryCall = calls.length;
    const restored = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
    t.after(() => restored.dispose());
    await restored.open(f.experience);

    assert.equal(restored.snapshot().error, null);
    assert.notEqual(restored.snapshot().activity?.id, unrelated.activity.id, "the saved occurrence must never be replaced by discovery");
    const exact = await f.session.activityCreate(saved.occurrence, f.experience.activity);
    assert.equal(restored.snapshot().activity?.id, exact.id);
    if (original) assert.deepEqual(restored.snapshot().activity, original, "idempotent recovery retains server answers and revision");
    assert.equal(f.journalEntry()?.occurrence, saved.occurrence);
    assert.equal(f.journalEntry()?.activity, exact.id);
    assert.equal(f.occurrenceCount(), 1, "recovery cannot generate a replacement occurrence");
    assert.deepEqual(calls.slice(firstRecoveryCall).map(call => call.method), ["activityCreate"]);
    assert.deepEqual(calls.filter(call => call.method === "activityCreate").map(call => (call.input as { occurrence: string }).occurrence), [saved.occurrence, saved.occurrence]);
    assert.equal(calls.some(call => call.method === "accept" || call.method === "activityPrepare"), false);
    assert.equal(JSON.stringify(restored.snapshot()).includes("Another saved draft"), false);
    assert.equal(JSON.stringify(f.journalEntry()).includes("answer"), false);
  });
}

test("the canonical controller already makes occurrence retries idempotent without executing the command", async t => {
  const f = await activityClientFixture(t), saved = await f.seed("Exact saved occurrence");
  const other = await f.seed("Separate occurrence");
  const recovered = await f.session.activityCreate(saved.occurrence, f.experience.activity);
  assert.deepEqual(recovered, saved.activity);
  assert.notEqual(recovered.id, other.activity.id);
  assert.equal((await f.session.activityList()).items.length, 2);
  assert.equal(recovered.phase, "draft");
  assert.equal(recovered.intentId, undefined);
  assert.equal(f.calls.some(call => call.method === "accept"), false);
});
