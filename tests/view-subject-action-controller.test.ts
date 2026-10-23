import test from "node:test";
import assert from "node:assert/strict";
import { multiViewRuntime, until } from "./fixtures/multi-view-runtime.ts";
import { multiProgram } from "./fixtures/multi-view-program.ts";
import { ArchiveNote, ReadNote } from "./fixtures/view-subject-actions.ts";
import { captureViewEvents } from "./fixtures/owned-view-events.ts";

test("Published input-free action uses the real controller effect, guard, receipt and read scope without losing a draft", async t => {
  const definition = { ...multiProgram,
    objects: multiProgram.objects.map(object => ({ ...object,
      actions: [...object.actions, { journey: ArchiveNote.id, icon: "archive" as const }] })),
    journeys: [...multiProgram.journeys, { id: ArchiveNote.id, kind: "action", source: ReadNote.id, outputs: [] }],
  };
  const f = await multiViewRuntime(t, definition);
  const note = await f.create("notes", "Archive exactly this note", "Original body");
  f.emit({ kind: "surface.invoke", intent: { kind: "close" } });
  f.output("notes", "create"); f.input("title", "Unfinished new note"); f.input("body", "Retain my writing");
  f.emit({ kind: "surface.invoke", intent: { kind: "close" } });
  f.output("notes", "select", note.id);
  await until(() => f.model.snapshot().state.offers[ArchiveNote.id]?.eligible === true);
  f.control.connected = false;
  await until(() => !f.model.snapshot().state.availability.journeys[ArchiveNote.id]?.dependenciesReady);
  const unavailableWrites = f.calls.filter(call => call.method === "prepare").length;
  f.invoke(ArchiveNote.id);
  assert.equal(f.calls.filter(call => call.method === "prepare").length, unavailableWrites);
  f.control.connected = true;
  await until(() => f.model.snapshot().state.availability.journeys[ArchiveNote.id]?.dependenciesReady === true &&
    f.model.snapshot().state.offers[ArchiveNote.id]?.eligible === true);
  const oldDetail = captureViewEvents(f.model);
  f.invoke(ArchiveNote.id);
  await until(() => f.model.snapshot().state.view === "review" && !f.model.snapshot().state.busy);
  assert.equal(f.model.snapshot().state.editing, null);
  assert.equal(await f.receipts(), 1);
  const before = f.calls.length;
  oldDetail({ kind: "surface.invoke", intent: { kind: "journey", journey: ArchiveNote.id } });
  assert.equal(f.calls.length, before, "departed subject instance cannot invoke again");
  f.control.lostAcceptance = true;
  f.emit({ kind: "surface.invoke", intent: { kind: "accept" } });
  await until(() => f.model.snapshot().uncertain && !f.model.snapshot().state.busy);
  f.emit({ kind: "surface.invoke", intent: { kind: "recover" } });
  await until(() => !f.model.snapshot().uncertain && f.model.snapshot().state.detail?.version === 2);
  assert.equal(await f.receipts(), 2);
  assert.deepEqual((await f.persisted()).map(row => [row.version, row.facts.title, row.facts.body, row.facts.state]),
    [[2, "Archive exactly this note", "Original body", "archived"]]);
  assert.equal(f.model.snapshot().state.offers[ArchiveNote.id]?.eligible, false);
  assert.deepEqual(f.model.snapshot().state.draft, { title: "Unfinished new note", body: "Retain my writing" });
  f.invoke(ArchiveNote.id);
  assert.equal(await f.receipts(), 2);
  const prepared = f.calls.filter(call => call.method === "prepare");
  assert.equal(prepared.length, 2);
  assert.deepEqual(prepared.at(-1)?.input.input, {});
  assert.equal(prepared.at(-1)?.input.options, undefined);
  f.control.lostAcceptance = false;
  await f.create("cards", "Other object", "Does not publish note actions");
  assert.throws(() => f.invoke(ArchiveNote.id), /INVALID_VIEW_EVENT/);
});
