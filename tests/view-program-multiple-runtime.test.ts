import assert from "node:assert/strict";
import test from "node:test";
import { multiViewRuntime, until } from "./fixtures/multi-view-runtime.ts";
import { multiProgram } from "./fixtures/multi-view-program.ts";

test("two object journeys create/read through one controller and retain isolated collections", async t => {
  const f = await multiViewRuntime(t);
  const note = await f.create("notes", "Private note", "Note body");
  assert.equal(f.model.snapshot().panel?.frame.top.title, "Private note");
  assert.deepEqual(f.model.snapshot().panel?.frame.top.trailing?.map(item => item.icon), ["edit"]);
  const card = await f.create("cards", "Independent card", "Card body");
  assert.notEqual(card.id, note.id);
  assert.deepEqual(f.model.snapshot().state.records.map(item => item.id), [card.id]);
  f.model.navigate("notes"); await until(() => f.model.snapshot().state.records.some(item => item.id === note.id));
  assert.deepEqual(f.model.snapshot().state.records.map(item => item.id), [note.id]);
  assert.deepEqual((await f.persisted()).map(item => [item.object_type, item.facts.title]), [
    ["card", "Independent card"], ["note", "Private note"],
  ]);
  assert.equal(await f.receipts(), 2);
});

test("published edit maps explicit facts, preserves base and recovers the original accepted operation", async t => {
  const mapped = { ...multiProgram, journeys: multiProgram.journeys.map(item => item.kind === "update"
    ? { ...item, initialize: [{ input: "title", fact: "body" }, { input: "body", fact: "title" }] } : item) };
  const f = await multiViewRuntime(t, mapped), note = await f.create("notes", "Original title", "Original body");
  f.invoke("edit-note");
  assert.deepEqual(f.model.snapshot().state.draft, { title: "Original body", body: "Original title" });
  f.input("title", "Edited title"); f.input("body", "Edited body");
  f.control.lostAcceptance = true; f.invoke("edit-note");
  await until(() => f.model.snapshot().uncertain && !f.model.snapshot().state.busy);
  const prepares = f.calls.filter(item => item.method === "prepare");
  assert.deepEqual(prepares.at(-1)?.input.options, { expectedVersion: note.version });
  f.model.navigate("cards"); assert.equal(f.model.snapshot().activeDestination, "notes");
  f.emit({ kind: "surface.invoke", intent: { kind: "recover" } });
  await until(() => !f.model.snapshot().uncertain && f.model.snapshot().state.detail?.version === 2);
  assert.equal(f.model.snapshot().panel?.frame.top.title, "Edited title");
  assert.equal(f.calls.filter(item => item.method === "prepare").length, prepares.length);
  assert.equal(await f.receipts(), 2);
  assert.deepEqual((await f.persisted()).map(item => [item.version, item.facts.title, item.facts.body]), [[2, "Edited title", "Edited body"]]);
});

test("controller loss preserves the edit and its old base; reconnect cannot overwrite a newer version", async t => {
  const f = await multiViewRuntime(t), note = await f.create("notes", "Initial", "Initial body");
  f.invoke("edit-note"); f.input("body", "Unsent local writing");
  f.control.connected = false;
  await until(() => !f.model.snapshot().state.availability.journeys["edit-note"]?.dependenciesReady);
  assert.equal(f.model.snapshot().panel?.frame.bottom.primary?.state, "unavailable");
  const writes = f.calls.filter(item => item.method === "prepare").length;
  f.invoke("edit-note"); assert.equal(f.calls.filter(item => item.method === "prepare").length, writes);
  const other = await f.session.prepare((await f.session.begin("edit-note", note.id)).id,
    { title: "External", body: "Newer body" }, { expectedVersion: note.version });
  await f.session.accept(other.id, other.confirmationDigest);
  f.control.connected = true;
  await until(() => f.model.snapshot().state.detail?.version === 2);
  assert.equal(f.model.snapshot().state.editing?.expectedVersion, 1);
  assert.equal(f.model.snapshot().state.draft.body, "Unsent local writing");
  f.invoke("edit-note"); await until(() => f.model.snapshot().error === "VERSION_CONFLICT");
  assert.equal(await f.receipts(), 2);
  assert.equal((await f.persisted())[0].facts.body, "Newer body");
});

test("late collection response from one read cannot replace the newly active object's collection", async t => {
  const f = await multiViewRuntime(t);
  const note = await f.create("notes", "Note", "Note body"), card = await f.create("cards", "Card", "Card body");
  let release!: () => void, reached!: () => void;
  const waiting = new Promise<void>(resolve => { reached = resolve; });
  f.control.delayRead = () => { reached(); return new Promise<void>(resolve => { release = resolve; }); };
  f.model.navigate("notes"); await waiting;
  f.control.delayRead = null; f.model.navigate("cards");
  await until(() => f.model.snapshot().state.records.some(item => item.id === card.id));
  release(); await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(f.model.snapshot().activeDestination, "cards");
  assert.deepEqual(f.model.snapshot().state.records.map(item => item.id), [card.id]);
  assert.ok(!f.model.snapshot().state.records.some(item => item.id === note.id));
});
