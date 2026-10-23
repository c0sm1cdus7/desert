import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { clientEditFixture, until } from "./fixtures/client-edit.ts";

test("connected reads refresh published facts and action eligibility without replaying operations", async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  f.control.record = { ...f.control.record, version: 2,
    facts: { ...f.control.record.facts, title: "Changed by another surface", state: "archived" } };
  f.control.eligible = false;
  await until(() => f.model.snapshot().detail?.version === 2);
  assert.equal(f.model.snapshot().detail?.facts.title, "Changed by another surface");
  assert.equal(f.model.snapshot().records[0]?.version, 2);
  assert.equal(f.model.snapshot().offers[f.mutation.id]?.eligible, false);
  assert.deepEqual(f.writes(), []);
});

test("an object removed from its active read closes stale detail without erasing the creation draft", async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  f.model.create(); f.model.edit("title", "Unsent creation"); f.model.close();
  assert.equal(f.model.snapshot().view, "detail");
  f.control.readVisible = false;
  await until(() => f.model.snapshot().view === "list");
  assert.equal(f.model.snapshot().detail, null);
  assert.equal(f.model.snapshot().selectedId, null);
  assert.deepEqual(f.model.snapshot().records, []);
  assert.deepEqual(f.model.snapshot().offers, {});
  assert.equal(f.model.snapshot().draft.title, "Unsent creation");
  assert.deepEqual(f.writes(), []);
});

test("live facts retain an editor's original version and unsent writing", async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  assert.equal(f.model.startEdit(f.mutation.id), true);
  f.model.edit("body", "My unsubmitted writing");
  f.control.record = { ...f.control.record, version: 2,
    facts: { ...f.control.record.facts, title: "Remote title", body: "Remote body" } };
  await until(() => f.model.snapshot().detail?.version === 2);
  assert.equal(f.model.snapshot().view, "edit");
  assert.equal(f.model.snapshot().editing?.expectedVersion, 1);
  assert.equal(f.model.snapshot().draft.title, "Original title");
  assert.equal(f.model.snapshot().draft.body, "My unsubmitted writing");
  assert.deepEqual(f.writes(), []);
});

test("unchanged connected reads keep the same published data references and stay bounded", async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  const before = f.model.snapshot(), reads = f.calls.filter(call => call.operation === "read").length;
  const admissions = f.calls.filter(call => call.operation === "begin").length;
  await delay(1350);
  const count = f.calls.filter(call => call.operation === "read").length - reads;
  assert.ok(count >= 2 && count <= 4, `expected one bounded collection/detail refresh, received ${count} reads`);
  assert.equal(f.calls.filter(call => call.operation === "begin").length, admissions,
    "unchanged polls reuse admitted read runs instead of creating durable runs each second");
  assert.equal(f.model.snapshot().detail, before.detail);
  assert.equal(f.model.snapshot().records, before.records);
  assert.equal(f.model.snapshot().offers, before.offers);
  assert.deepEqual(f.writes(), []);
});

test("an uncertain confirmation suspends background reads without replaying or erasing recovery", async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  f.model.startEdit(f.mutation.id); f.model.edit("body", "Keep this result recoverable");
  f.control.lostAcceptance = true; await f.model.invoke(f.mutation);
  assert.equal(f.model.snapshot().uncertain, true);
  const prepared = f.model.snapshot().prepared, writes = f.writes().length;
  const reads = f.calls.filter(call => call.operation === "read").length;
  await delay(1350);
  assert.equal(f.calls.filter(call => call.operation === "read").length, reads);
  assert.equal(f.writes().length, writes);
  assert.equal(f.model.snapshot().prepared, prepared);
  assert.equal(f.model.snapshot().view, "recovery");
});

for (const leave of ["close", "back"] as const) test(`${leave} releases hidden detail and offers but keeps the creation draft`, async t => {
  const f = await clientEditFixture(t); t.after(() => f.model.dispose());
  f.model.create(); f.model.edit("title", "Keep this creation"); f.model.close();
  assert.equal(f.model.snapshot().view, "detail", "creation from detail keeps its return destination");
  f.model[leave]();
  assert.equal(f.model.snapshot().view, "list");
  assert.equal(f.model.snapshot().selectedId, null);
  assert.equal(f.model.snapshot().detail, null);
  assert.deepEqual(f.model.snapshot().offers, {});
  const offers = f.calls.filter(call => call.operation === "offer").length;
  await delay(1350);
  assert.equal(f.calls.filter(call => call.operation === "offer").length, offers);
  assert.equal(f.model.snapshot().draft.title, "Keep this creation");
  assert.deepEqual(f.writes(), []);
});
