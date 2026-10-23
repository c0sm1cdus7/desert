import test from "node:test";
import assert from "node:assert/strict";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { TransportError, type ControllerTransport } from "../src/web/client/transport.ts";
import { dispatch } from "../src/web/dispatch.ts";

test("session invalidation after acceptance preserves exact recovery even before the old component is disposed", async t => {
  const f = await activityClientFixture(t);
  let accepts = 0;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      const result = await dispatch(f.session, method, input);
      if (method === "accept") { accepts++; throw new TransportError("BROWSER_SESSION_CHANGED"); }
      return result;
    },
  };
  const old = activityModel(f.surface, transport, () => {}, async () => {}, f.journal);
  t.after(() => old.dispose());
  await old.open(f.experience); old.edit("title", "A private draft"); await old.next();
  old.edit("body", "A private answer"); await old.next();
  const expectedIntent = old.snapshot().prepared!.id;
  await old.accept();
  assert.equal(f.journalEntry()?.pending?.intentId, expectedIntent);
  assert.equal(old.snapshot().uncertain, true);
  await old.accept(); old.close();
  assert.equal(accepts, 1); assert.equal(f.journalEntry()?.pending?.intentId, expectedIntent);
  old.dispose();
  let recovered = false;
  const restored = activityModel(f.surface, transport, () => {}, async () => { recovered = true; }, f.journal);
  t.after(() => restored.dispose());
  await restored.open(f.experience);
  assert.equal(recovered, true); assert.equal(f.journalEntry(), null); assert.equal(accepts, 1);
});
