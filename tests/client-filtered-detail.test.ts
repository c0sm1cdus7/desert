import assert from "node:assert/strict";
import test from "node:test";
import { clientEditFixture, until } from "./fixtures/client-edit.ts";

test("a selected record leaving its authoritative read closes the detail, not an endless loading panel", async t => {
  const f = await clientEditFixture(t);
  t.after(() => f.model.stop());
  f.control.connected = false;
  await until(() => !f.model.snapshot().availability.journeys[f.mutation.id]?.dependenciesReady);
  f.control.readVisible = false;
  f.control.connected = true;
  await until(() => f.model.snapshot().records.length === 0);
  assert.equal(f.model.snapshot().view, "list");
  assert.equal(f.model.snapshot().selectedId, null);
  assert.equal(f.model.snapshot().detail, null);
  assert.deepEqual(f.model.snapshot().offers, {});
  assert.deepEqual(f.writes(), []);
});

test("a record leaving its read never discards an existing editor's draft", async t => {
  const f = await clientEditFixture(t);
  t.after(() => f.model.stop());
  f.model.startEdit(f.mutation.id);
  f.model.edit("body", "Do not discard this writing");
  f.control.connected = false;
  await until(() => !f.model.snapshot().availability.journeys[f.mutation.id]?.dependenciesReady);
  f.control.readVisible = false;
  f.control.connected = true;
  await until(() => f.model.snapshot().records.length === 0);
  assert.equal(f.model.snapshot().view, "edit");
  assert.equal(f.model.snapshot().draft.body, "Do not discard this writing");
  assert.deepEqual(f.model.snapshot().offers, {});
  assert.deepEqual(f.writes(), []);
});
