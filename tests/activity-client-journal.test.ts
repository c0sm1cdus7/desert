import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { activityClientFixture } from "./fixtures/activity-client.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { browserActivityHost } from "../src/svelte/pieces/activity-host.ts";
import { dispatch } from "../src/web/dispatch.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import type { ActivityHost } from "../src/web/client/activity-host.ts";

test("failure to persist pending acceptance prevents sending the acceptance request", async t => {
  const f = await activityClientFixture(t);
  let rejectWrites = false, acceptCalls = 0;
  const journal: ActivityHost = { ...f.journal, save(entry) {
    if (rejectWrites) throw new Error("Storage unavailable");
    f.journal.save(entry);
  } };
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused"); },
    async call(method, input) {
      if (method === "accept") acceptCalls++;
      return dispatch(f.session, method, input);
    },
  };
  const model = activityModel(f.surface, transport, () => {}, async () => {}, journal);
  t.after(() => model.dispose());
  await model.open(f.experience); model.edit("title", "Storage witness"); await model.next();
  model.edit("body", "No unjournaled acceptance"); await model.next();
  rejectWrites = true;
  await model.accept();
  assert.equal(acceptCalls, 0);
  assert.equal((await f.session.activityRead(model.snapshot().activity!.id)).phase, "prepared");
});

test("private browser journals scope pending recovery to ready identity and never adopt unscoped legacy data", t => {
  const storage = new Map<string, string>();
  const prior = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "sessionStorage", prior); else Reflect.deleteProperty(globalThis, "sessionStorage"); });
  const ready = (id: string) => ({ kind: "ready", sessionBinding: "A".repeat(43), identity: {
    kind: "human", id, displayName: "Journal witness", login: "witness", role: "member",
  } } as const);
  const legacyKey = "desert.activity/contract/human";
  storage.set(legacyKey, JSON.stringify({ journey: "guided", occurrence: randomUUID(), activity: randomUUID() }));
  const first = browserActivityHost("contract", "human", ready(randomUUID()));
  const second = browserActivityHost("contract", "human", ready(randomUUID()));
  assert.equal(first.load(), null, "protected identities must not infer ownership of the old shared journal");
  const entry = { journey: "guided", occurrence: randomUUID(), activity: randomUUID() };
  first.save(entry);
  assert.equal(second.load(), null);
  second.clear();
  assert.deepEqual(first.load(), entry);
  assert.ok(storage.has(legacyKey), "old unknown-owner data is preserved, not deleted");
  assert.throws(() => browserActivityHost("contract", "human", { kind: "locked" }), /ACTIVITY_IDENTITY_REQUIRED/);
  assert.throws(() => browserActivityHost("contract", "human", { kind: "unavailable" }), /ACTIVITY_IDENTITY_REQUIRED/);
});
