import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { compile } from "../src/compile.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { ActivityJournalVersion, type ActivityJournalEntry } from "../src/web/client/activity-host.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";

test("opening a different installed activity cannot overwrite another activity's pending acceptance", async () => {
  const firstExecution = ActivityNotebook.journeys.find(journey => journey.id === "create-note")!;
  const nextId = "another-guided-note";
  const definition = { ...ActivityNotebook, journeys: [...ActivityNotebook.journeys, { ...firstExecution, id: nextId }],
    surfaces: ActivityNotebook.surfaces.map(surface => surface.kind !== "human" ? surface : {
      ...surface, journeys: [...surface.journeys, nextId], commit: { ...surface.commit, [nextId]: "review" },
      language: { ...surface.language, journeys: { ...surface.language.journeys, [nextId]: "Another guided note" } },
    }) };
  const surface = compile(definition).surface("human") as HumanSurface;
  const firstExperience = guidedProgram.journeys.find(journey => journey.kind === "activity")!;
  if (firstExperience.kind !== "activity") throw new Error("Missing first activity");
  const program = compileViewProgram({ ...guidedProgram,
    views: guidedProgram.views.map(view => view.id !== "notes" ? view : { ...view,
      outputs: [...view.outputs, "another"], topDock: { ...view.topDock,
        actions: [...view.topDock.actions, { output: "another", label: "Another guided note", icon: "create" }] } }),
    journeys: [...guidedProgram.journeys.map(journey => journey.id !== "read-note" ? journey : { ...journey,
      outputs: [...journey.outputs, { view: "notes", output: "another", action: { kind: "journey", journey: nextId } }] }),
    { ...firstExperience, id: nextId, activity: { ...firstExperience.activity, journey: nextId } }] }, surface);
  const next = program.journeys.find(journey => journey.kind === "activity" && journey.id === nextId)!;
  assert.equal(next.kind, "activity"); if (next.kind !== "activity") throw new Error("Missing activity");
  const original: ActivityJournalEntry = { version: ActivityJournalVersion, journey: firstExperience.id,
    occurrence: randomUUID(), activity: randomUUID(), pending: { kind: "accept", intentId: randomUUID() } };
  let entry: ActivityJournalEntry | null = original, calls = 0;
  const model = activityModel(surface, {
    async evidence() { throw new Error("Unused"); },
    async call() { calls++; throw new Error("Another activity must wait for recovery"); },
  }, () => {}, async () => {}, { load: () => entry, save: value => { entry = value; }, clear: () => { entry = null; },
    createOccurrence: randomUUID });
  await model.open(next); model.dispose();
  assert.deepEqual(entry, original);
  assert.equal(calls, 0);
});

test("Close before startup restores the pending activity cannot erase its recovery journal", () => {
  const surface = compile(ActivityNotebook).surface("human") as HumanSurface;
  const original: ActivityJournalEntry = { version: ActivityJournalVersion, journey: "create-note",
    occurrence: randomUUID(), activity: randomUUID(), pending: { kind: "accept", intentId: randomUUID() } };
  let entry: ActivityJournalEntry | null = original;
  const model = activityModel(surface, { async evidence() { throw new Error("Unused"); },
    async call() { throw new Error("No request expected"); } }, () => {}, async () => {}, {
    load: () => entry, save: value => { entry = value; }, clear: () => { entry = null; }, createOccurrence: randomUUID,
  });
  model.close(); model.dispose();
  assert.deepEqual(entry, original);
});
